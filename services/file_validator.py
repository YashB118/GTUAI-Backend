from fastapi import HTTPException

PDF_MAGIC = b"%PDF"
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB


def validate_pdf(content: bytes, filename: str) -> None:
    """Raise HTTPException if content is not a valid PDF under size limit."""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    if len(content) < 4 or content[:4] != PDF_MAGIC:
        raise HTTPException(status_code=400, detail="File is not a valid PDF (magic bytes check failed)")
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Max file size is 10 MB")
