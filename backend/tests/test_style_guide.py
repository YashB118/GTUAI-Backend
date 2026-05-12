"""
Unit tests for services.gtu_style_guide.
Run with: cd backend && .venv/bin/python -m pytest tests/test_style_guide.py -v
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.gtu_style_guide import (
    EXEMPLARS,
    GTU_SYSTEM_RULES,
    question_type_hint,
    style_block,
)


class TestStyleBlock:
    def test_style_block_non_empty(self):
        out = style_block(7)
        assert out and len(out) > 200

    def test_style_block_contains_rubric_markers(self):
        out = style_block(7)
        # Key style markers from the rubric must show through.
        for marker in ("GTU", "Diagram:", "Conclusion:", "**term**", "EXEMPLAR"):
            assert marker in out, f"missing marker: {marker}"

    def test_style_block_picks_seven_mark_exemplar(self):
        out = style_block(7)
        assert "7-mark" in out

    def test_style_block_lower_tier_for_low_marks(self):
        out = style_block(2)
        assert "2-mark" in out

    def test_style_block_token_budget(self):
        # Loose token proxy: chars/4. Must stay under ~1500 tokens => ~6000 chars.
        assert len(style_block(7)) < 6000

    def test_exemplars_have_required_tiers(self):
        for tier in (2, 3, 4, 7):
            assert tier in EXEMPLARS
            assert EXEMPLARS[tier]
            for ex in EXEMPLARS[tier]:
                assert "question" in ex and "answer" in ex


class TestQuestionTypeHint:
    def test_define_vs_derive_differ(self):
        a = question_type_hint("Define recursion.")
        b = question_type_hint("Derive the time complexity of merge sort.")
        assert a != b

    def test_numerical_detected(self):
        hint = question_type_hint("Calculate the throughput when bandwidth is 10 Mbps.")
        assert "Numerical" in hint

    def test_comparison_detected(self):
        hint = question_type_hint("Compare TCP and UDP.")
        assert "Comparison" in hint

    def test_diagram_detected(self):
        hint = question_type_hint("Draw a labelled diagram of the OSI model.")
        assert "Diagram" in hint

    def test_list_detected(self):
        hint = question_type_hint("List the characteristics of an algorithm.")
        assert "List" in hint or "list" in hint

    def test_empty_falls_back(self):
        # Empty input must not crash; should return some hint.
        hint = question_type_hint("")
        assert hint and len(hint) > 10


class TestRubric:
    def test_rubric_mentions_marks_mapping(self):
        for tier in ("1 mark", "2 marks", "3 marks", "4 marks", "7 marks"):
            assert tier in GTU_SYSTEM_RULES
