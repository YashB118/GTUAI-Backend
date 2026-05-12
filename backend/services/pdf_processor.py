import io
import json
import threading
import uuid
import logging
from typing import Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

_embedder = None
_qdrant   = None
_embedder_lock = threading.Lock()   # prevents concurrent model init (race → meta-tensor crash)
_qdrant_lock   = threading.Lock()

MODEL_NAME = "BAAI/bge-small-en-v1.5"  # 384-dim, better accuracy than all-MiniLM-L6-v2


def get_embedder():
    global _embedder
    if _embedder is not None:
        return _embedder
    with _embedder_lock:
        if _embedder is None:   # double-checked locking
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading SentenceTransformer model {MODEL_NAME}...")
            _embedder = SentenceTransformer(MODEL_NAME)
            logger.info("Embedding model loaded.")
    return _embedder


def get_qdrant():
    global _qdrant
    if _qdrant is not None:
        return _qdrant
    with _qdrant_lock:
        if _qdrant is None:
            from qdrant_client import QdrantClient
            from config import settings
            if not settings.qdrant_url:
                raise RuntimeError("QDRANT_URL not configured in .env")
            _qdrant = QdrantClient(
                url=settings.qdrant_url,
                api_key=settings.qdrant_api_key or None,
            )
    return _qdrant


def ensure_collection():
    from qdrant_client.models import VectorParams, Distance, PayloadSchemaType
    client = get_qdrant()
    existing = [c.name for c in client.get_collections().collections]
    if "gtu_questions" not in existing:
        client.create_collection(
            collection_name="gtu_questions",
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
        logger.info("Created Qdrant collection 'gtu_questions'")
    # Ensure payload index on subject_id exists (required for filtered search)
    try:
        client.create_payload_index(
            collection_name="gtu_questions",
            field_name="subject_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )
        logger.info("Created Qdrant payload index on subject_id")
    except Exception:
        pass  # index already exists


def extract_text(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    for page in doc:
        pages.append(page.get_text("text"))
    doc.close()
    return "\n".join(pages)


def _extract_via_vision(model, genai, prompt: str, file_bytes: bytes) -> list:
    """Upload PDF to Gemini Files API and extract questions via vision."""
    import os
    import tempfile
    import time

    tmp_path = None
    uploaded_file = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        uploaded_file = genai.upload_file(tmp_path, mime_type="application/pdf")

        # Wait for file to be ACTIVE (can take a few seconds for large PDFs)
        for _ in range(10):
            state = uploaded_file.state.name if hasattr(uploaded_file, "state") else "ACTIVE"
            if state == "ACTIVE":
                break
            if state == "FAILED":
                logger.error("Gemini file upload failed (FAILED state)")
                return []
            time.sleep(2)
            uploaded_file = genai.get_file(uploaded_file.name)

        response = model.generate_content(
            [uploaded_file, prompt],
            generation_config={"temperature": 0.1},
        )
        text = response.text.strip()

        # Strip markdown fences
        if text.startswith("```"):
            lines = text.splitlines()
            inner = lines[1:]
            if inner and inner[-1].strip() == "```":
                inner = inner[:-1]
            text = "\n".join(inner)

        try:
            result = json.loads(text)
            logger.info(f"Gemini vision extracted {len(result) if isinstance(result, list) else 0} questions")
            return result if isinstance(result, list) else []
        except json.JSONDecodeError as e:
            logger.warning(f"Gemini vision JSON parse failed: {e}. Raw: {text[:300]}")
            return []

    except Exception as e:
        logger.error(f"Gemini vision extraction error: {e}", exc_info=True)
        return []
    finally:
        if uploaded_file:
            try:
                genai.delete_file(uploaded_file.name)
            except Exception:
                pass
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def extract_questions_gemini(raw_text: str, subject_name: str, file_bytes: bytes = None) -> list:
    """
    Extract questions from a PDF.
    - Text-based PDFs: Groq (primary) → Gemini (fallback) via services.llm
    - Scanned/image PDFs: Gemini vision only (Groq cannot process images)
    """
    from services.llm import generate_json, is_groq_available
    from config import settings

    prompt = f"""Extract all exam questions from this GTU {subject_name} question paper.
Return ONLY a valid JSON array with no explanation and no markdown fences.

Each item in the array must be an object with these fields:
{{
  "text": "complete question text exactly as written",
  "marks": <integer or null>,
  "unit": <unit number 1-8 or null>,
  "type": "theory|numerical|short|long|fill|mcq"
}}

Rules:
- Include sub-questions as separate items
- Clean any OCR artifacts
- If marks not mentioned, set null
- Detect units from headers like "UNIT-3" or "Section C"

JSON array:"""

    if raw_text.strip():
        # Text-based PDF — Groq first, Gemini fallback (via generate_json)
        full_prompt = prompt + f"\n\nPaper text (first 8000 chars):\n{raw_text[:8000]}"
        try:
            result = generate_json(full_prompt)
            if isinstance(result, list):
                logger.info(f"Extracted {len(result)} questions via {'Groq' if is_groq_available() else 'Gemini'}")
                return result
            return []
        except Exception as e:
            logger.warning(f"LLM question extraction failed: {e} — trying Gemini vision fallback")
            if file_bytes and settings.gemini_api_key:
                import google.generativeai as genai
                genai.configure(api_key=settings.gemini_api_key)
                model = genai.GenerativeModel(settings.gemini_model)
                return _extract_via_vision(model, genai, prompt, file_bytes)
            return []

    elif file_bytes:
        # Scanned/image PDF — Gemini vision only
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY required for scanned PDF processing")
        logger.info("No text layer found; using Gemini vision for scanned PDF")
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)
        return _extract_via_vision(model, genai, prompt, file_bytes)

    else:
        logger.warning("No text and no file_bytes provided to extract_questions_gemini")
        return []


def embed_text(text: str) -> list:
    embedder = get_embedder()
    # BGE models improve accuracy with an instruction prefix for short queries
    if len(text) < 200:
        text = f"Represent this GTU exam question for retrieval: {text}"
    return embedder.encode(text, show_progress_bar=False).tolist()


def store_in_qdrant(question_text: str, embedding: list, metadata: dict) -> str:
    from qdrant_client.models import PointStruct
    client = get_qdrant()
    point_id = str(uuid.uuid4())
    client.upsert(
        collection_name="gtu_questions",
        points=[PointStruct(
            id=point_id,
            vector=embedding,
            payload={
                "text": question_text,
                "subject_id": metadata["subject_id"],
                "year": metadata.get("year"),
                "marks": metadata.get("marks"),
                "unit": metadata.get("unit"),
                "type": metadata.get("type"),
                "paper_id": metadata.get("paper_id"),
            },
        )],
    )
    return point_id


def find_similar_questions(embedding: list, subject_id: str, threshold: float = 0.60) -> list:
    from qdrant_client.models import Filter, FieldCondition, MatchValue
    client = get_qdrant()
    try:
        return client.search(
            collection_name="gtu_questions",
            query_vector=embedding,
            query_filter=Filter(
                must=[FieldCondition(
                    key="subject_id",
                    match=MatchValue(value=subject_id),
                )]
            ),
            limit=10,
            score_threshold=threshold,
        )
    except Exception as e:
        logger.warning(f"Qdrant search error: {e}")
        return []
