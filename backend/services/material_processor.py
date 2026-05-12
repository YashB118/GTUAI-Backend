import logging
import re
import uuid
from datetime import datetime, timezone

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

CHUNK_SIZE    = 900    # characters — fits ~180-200 words, one complete concept
CHUNK_OVERLAP = 150    # preserve cross-chunk continuity

# Protect formula regions from being split mid-way
_FORMULA_RE = re.compile(r'\$[^$]+\$|\$\$[^$]+\$\$|[A-Z]\s*=\s*[^\n.]+', re.DOTALL)
_HEADER_RE  = re.compile(r'\n(?=[A-Z][A-Z0-9 ]{2,40}\n)', re.MULTILINE)


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


def _classify_chunk(text: str) -> str:
    """Classify chunk for content-type aware retrieval."""
    if re.search(r'=\s*[\d\w(]+', text):
        return "formula"
    if text.startswith("Definition") or "is defined as" in text or "refers to" in text:
        return "definition"
    if re.search(r'\|\s*\w+\s*\|', text):
        return "table"
    if "for example" in text.lower() or "e.g." in text.lower():
        return "example"
    return "explanation"


def _sentence_aware_split(text: str) -> list[str]:
    """Split text at sentence boundaries, respecting CHUNK_SIZE with CHUNK_OVERLAP."""
    # Protect formulas — replace with placeholders
    formulas: dict[str, str] = {}
    def _protect(m: re.Match) -> str:
        key = f"__FORMULA_{len(formulas)}__"
        formulas[key] = m.group(0)
        return key
    protected = _FORMULA_RE.sub(_protect, text)

    chunks: list[str] = []
    start = 0
    while start < len(protected):
        end = start + CHUNK_SIZE
        segment = protected[start:end]
        # try to end at sentence boundary
        if end < len(protected):
            last_dot = max(segment.rfind('. '), segment.rfind('.\n'))
            if last_dot > CHUNK_SIZE // 2:
                end = start + last_dot + 2  # include the period
                segment = protected[start:end]
        chunk = segment.strip()
        if len(chunk) > 80:
            # restore formulas
            for key, val in formulas.items():
                chunk = chunk.replace(key, val)
            chunks.append(chunk)
        if end >= len(protected):
            break
        start = end - CHUNK_OVERLAP
    return chunks


def _chunk_page_text(page_text: str, page_num: int) -> list[dict]:
    """Sentence-aware chunking with formula protection."""
    raw_chunks = _sentence_aware_split(page_text)
    result: list[dict] = []
    for i, chunk in enumerate(raw_chunks):
        result.append({
            "text":         chunk,
            "page":         page_num,
            "index":        i,
            "token_count":  len(chunk.split()),
            "content_type": _classify_chunk(chunk),
        })
    return result


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

        content_type = chunk.get("content_type", "explanation")

        client.upsert(
            collection_name="gtu_study_materials",
            points=[PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "material_id":  material_id,
                    "subject_id":   subject_id,
                    "text":         chunk["text"],
                    "page":         chunk["page"],
                    "chunk_index":  chunk["index"],
                    "content_type": content_type,
                },
            )],
        )

        try:
            supabase.table("material_chunks").insert({
                "material_id":  material_id,
                "subject_id":   subject_id,
                "chunk_text":   chunk["text"],
                "chunk_index":  chunk["index"],
                "page_number":  chunk["page"],
                "embedding_id": point_id,
                "token_count":  chunk["token_count"],
                "content_type": content_type,
            }).execute()
        except Exception:
            # content_type column may not exist on old DB — fall back
            supabase.table("material_chunks").insert({
                "material_id":  material_id,
                "subject_id":   subject_id,
                "chunk_text":   chunk["text"],
                "chunk_index":  chunk["index"],
                "page_number":  chunk["page"],
                "embedding_id": point_id,
                "token_count":  chunk["token_count"],
            }).execute()

        inserted += 1

    logger.info(f"Material {material_id}: {inserted} chunks embedded and stored")
    return inserted
