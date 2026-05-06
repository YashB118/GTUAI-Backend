"""
Unit tests for answer_engine helpers.
Run with: cd backend && .venv/bin/python -m pytest tests/test_answer_engine.py -v
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.answer_engine import _build_prompt


class TestBuildPrompt:
    def test_prompt_contains_question(self):
        prompt = _build_prompt("What is OSI model?", "", 7)
        assert "What is OSI model?" in prompt

    def test_prompt_contains_marks(self):
        prompt = _build_prompt("Explain TCP/IP.", "", 3)
        assert "3-mark" in prompt

    def test_word_limit_calculated_correctly(self):
        prompt = _build_prompt("Define cache.", "", 5)
        # 5 marks * 40 = 200 words
        assert "200 words" in prompt

    def test_prompt_contains_context_when_provided(self):
        context = "OSI model has 7 layers: Physical, Data Link, Network..."
        prompt = _build_prompt("Explain OSI model.", context, 7)
        assert "OSI model has 7 layers" in prompt
        assert "Relevant Study Material" in prompt

    def test_prompt_no_context_block_when_empty(self):
        prompt = _build_prompt("Explain OSI model.", "", 7)
        assert "Relevant Study Material" not in prompt

    def test_prompt_7_mark_rule_present(self):
        prompt = _build_prompt("Explain OSI model.", "", 7)
        assert "7+ mark" in prompt

    def test_prompt_3_mark_rule_present(self):
        prompt = _build_prompt("Define a router.", "", 3)
        assert "3-mark" in prompt

    def test_high_marks_word_limit(self):
        prompt = _build_prompt("Discuss DBMS.", "", 10)
        assert "400 words" in prompt

    def test_no_preamble_instruction_present(self):
        prompt = _build_prompt("What is IP?", "", 2)
        assert "start directly" in prompt

    def test_bold_instruction_present(self):
        prompt = _build_prompt("What is IP?", "", 2)
        assert "**term**" in prompt

    def test_prompt_contains_structured_headings_instruction(self):
        prompt = _build_prompt("Explain OSI model.", "", 7)
        assert "### Expected Question Format" in prompt
        assert "### How to Write" in prompt
        assert "### Ready-to-Write Answer" in prompt

    def test_prompt_enforces_code_policy_for_programming_questions(self):
        prompt = _build_prompt("Write a program for deadlock avoidance.", "", 7)
        assert "CODE EXAMPLE POLICY" in prompt
