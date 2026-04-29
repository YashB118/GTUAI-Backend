"""
Unit tests for material_processor chunking logic.
Run with: cd backend && .venv/bin/python -m pytest tests/test_material_processor.py -v
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.material_processor import _chunk_page_text, CHUNK_SIZE, CHUNK_OVERLAP


class TestChunkPageText:
    def test_short_text_single_chunk(self):
        text = "This is a short paragraph. " * 5  # ~135 chars
        chunks = _chunk_page_text(text, page_num=1)
        assert len(chunks) == 1
        assert chunks[0]["page"] == 1
        assert chunks[0]["index"] == 0
        assert len(chunks[0]["text"]) <= CHUNK_SIZE

    def test_long_text_multiple_chunks(self):
        text = "A" * 1200
        chunks = _chunk_page_text(text, page_num=2)
        # 1200 chars with CHUNK_SIZE=500, OVERLAP=80: should produce 3 chunks
        assert len(chunks) >= 2
        for chunk in chunks:
            assert len(chunk["text"]) <= CHUNK_SIZE

    def test_overlap_between_consecutive_chunks(self):
        text = "X" * 1000
        chunks = _chunk_page_text(text, page_num=1)
        assert len(chunks) >= 2
        # Second chunk should start before first chunk ends
        # chunk[0] covers [0, CHUNK_SIZE], chunk[1] starts at CHUNK_SIZE - CHUNK_OVERLAP
        expected_start = CHUNK_SIZE - CHUNK_OVERLAP
        # First chunk text ends at CHUNK_SIZE, second chunk starts at expected_start
        # Overlap chars = CHUNK_SIZE - expected_start = CHUNK_OVERLAP
        assert chunks[1]["index"] == 1

    def test_tiny_chunks_skipped(self):
        # Text that produces a very small last fragment
        text = "A" * 510  # 510 chars: chunk1=[0:500], then start=420, chunk2=[420:510]=90 chars
        chunks = _chunk_page_text(text, page_num=1)
        for chunk in chunks:
            assert len(chunk["text"]) > 50

    def test_extremely_short_text_below_minimum_skipped(self):
        text = "Hi"  # Only 2 chars — below 50 char minimum
        chunks = _chunk_page_text(text, page_num=1)
        assert len(chunks) == 0

    def test_exactly_minimum_length(self):
        text = "B" * 51  # 51 chars — just above minimum
        chunks = _chunk_page_text(text, page_num=1)
        assert len(chunks) == 1

    def test_chunk_indices_start_at_zero(self):
        text = "W" * 1500
        chunks = _chunk_page_text(text, page_num=1)
        indices = [c["index"] for c in chunks]
        assert indices[0] == 0
        assert indices == list(range(len(chunks)))

    def test_page_number_preserved(self):
        text = "Content on page 5. " * 30
        chunks = _chunk_page_text(text, page_num=5)
        for chunk in chunks:
            assert chunk["page"] == 5

    def test_token_count_populated(self):
        text = "word " * 200  # 200 words
        chunks = _chunk_page_text(text, page_num=1)
        for chunk in chunks:
            assert isinstance(chunk["token_count"], int)
            assert chunk["token_count"] > 0

    def test_empty_text_returns_no_chunks(self):
        chunks = _chunk_page_text("", page_num=1)
        assert chunks == []

    def test_whitespace_only_text_returns_no_chunks(self):
        chunks = _chunk_page_text("   \n\n\t  ", page_num=1)
        assert chunks == []
