import logging
import uuid
from datetime import datetime, timezone

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

CHUNK_SIZE = 500    # characters per chunk
CHUNK_OVERLAP = 80  # characters overlap between consecutive chunks


def _get_embedder():
    from services.pdf_processor import get_embedder
    return get_embedder()


def _get_qdrant():
    from services.pdf_processor import get_qdrant
    return get_qdrant()


def ensure_materials_collection() -> None:
    from qdrant_client.models import VectorParams, Distance, PayloadSchemaType
    client = _get_qdrant()
    existing = [c.name for c in client.get_collections().collections]
    if "gtu_study_materials" not in existing:
        client.create_collection(
            collection_name="gtu_study_materials",
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
        logger.info("Created Qdrant collection 'gtu_study_materials'")
    try:
        client.create_payload_index(
            collection_name="gtu_study_materials",
            field_name="subject_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )
    except Exception:
        pass  # index already exists


def _chunk_page_text(page_text: str, page_num: int) -> list[dict]:
    """Split one page's text into overlapping chunks of CHUNK_SIZE chars."""
    chunks: list[dict] = []
    start = 0
    chunk_idx = 0
    while start < len(page_text):
        end = start + CHUNK_SIZE
        chunk = page_text[start:end].strip()
        if len(chunk) > 50:
            chunks.append({
                "text": chunk,
                "page": page_num,
                "index": chunk_idx,
                "token_count": len(chunk.split()),
            })
            chunk_idx += 1
        if end >= len(page_text):
            break
        start = end - CHUNK_OVERLAP
    return chunks


def chunk_pdf_bytes(file_bytes: bytes) -> list[dict]:
    """Extract text from PDF bytes and return a flat list of chunk dicts."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    all_chunks: list[dict] = []
    for page_num, page in enumerate(doc, start=1):
        page_text = page.get_text("text").strip()
        if page_text:
            all_chunks.extend(_chunk_page_text(page_text, page_num))
    doc.close()
    return all_chunks


def process_material(supabase, material_id: str, subject_id: str, file_bytes: bytes) -> int:
    """
    Chunk + embed an approved study material PDF.
    Stores chunks in Qdrant 'gtu_study_materials' and the material_chunks table.
    Idempotent: deletes existing data for this material before re-inserting.
    Returns number of chunks created.
    """
    from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue

    ensure_materials_collection()

    chunks = chunk_pdf_bytes(file_bytes)
    if not chunks:
        logger.warning(f"No text extracted from material {material_id}")
        return 0

    embedder = _get_embedder()
    client = _get_qdrant()

    # Delete stale DB chunks
    supabase.table("material_chunks").delete().eq("material_id", material_id).execute()

    # Delete stale Qdrant points
    try:
        client.delete(
            collection_name="gtu_study_materials",
            points_selector=Filter(
                must=[FieldCondition(key="material_id", match=MatchValue(value=material_id))]
            ),
        )
    except Exception as e:
        logger.warning(f"Could not delete old Qdrant points for material {material_id}: {e}")

    inserted = 0
    for chunk in chunks:
        embedding = embedder.encode(chunk["text"], show_progress_bar=False).tolist()
        point_id = str(uuid.uuid4())

        client.upsert(
            collection_name="gtu_study_materials",
            points=[PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "material_id": material_id,
                    "subject_id": subject_id,
                    "text": chunk["text"],
                    "page": chunk["page"],
                    "chunk_index": chunk["index"],
                },
            )],
        )

        supabase.table("material_chunks").insert({
            "material_id": material_id,
            "subject_id": subject_id,
            "chunk_text": chunk["text"],
            "chunk_index": chunk["index"],
            "page_number": chunk["page"],
            "embedding_id": point_id,
            "token_count": chunk["token_count"],
        }).execute()

        inserted += 1

    logger.info(f"Material {material_id}: {inserted} chunks embedded and stored")
    return inserted
