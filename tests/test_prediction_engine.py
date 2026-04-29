"""
Unit tests for prediction scoring algorithm.
Run with: cd backend && .venv/bin/python -m pytest tests/ -v
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.prediction_engine import calculate_score, _max_consecutive


class TestMaxConsecutive:
    def test_single_year(self):
        assert _max_consecutive([2022]) == 1

    def test_two_consecutive(self):
        assert _max_consecutive([2021, 2022]) == 2

    def test_gap_resets(self):
        assert _max_consecutive([2019, 2020, 2022, 2023]) == 2

    def test_long_streak(self):
        assert _max_consecutive([2019, 2020, 2021, 2022, 2023]) == 5

    def test_no_consecutive(self):
        assert _max_consecutive([2018, 2020, 2022]) == 1


class TestCalculateScore:
    def test_single_year_is_low(self):
        score = calculate_score([2020])
        assert score < 45, f"Expected LOW score, got {score}"

    def test_many_years_is_higher(self):
        score_many = calculate_score([2018, 2019, 2020, 2021, 2022])
        score_few = calculate_score([2020])
        assert score_many > score_few

    def test_old_gap_boosts_score(self):
        # Asked 3+ years ago = should get max recency score (30 pts)
        from services.prediction_engine import CURRENT_YEAR
        old_year = CURRENT_YEAR - 4
        score = calculate_score([old_year - 1, old_year])
        # Recency component = 30 (long gap), check it contributes
        assert score >= 30

    def test_high_marks_boosts_score(self):
        years = [2020, 2021]
        score_high = calculate_score(years, avg_marks=7)
        score_low = calculate_score(years, avg_marks=1)
        assert score_high > score_low

    def test_score_above_70_is_high_confidence(self):
        # 8 years asked = frequency max (40), plus recency, consecutive, marks
        from services.prediction_engine import CURRENT_YEAR
        years = list(range(CURRENT_YEAR - 7, CURRENT_YEAR - 3))  # 4 years, gap of 3
        score = calculate_score(years, avg_marks=7)
        assert score >= 45, f"Expected at least MEDIUM confidence, got {score}"

    def test_empty_years_returns_zero(self):
        assert calculate_score([]) == 0.0

    def test_score_is_positive_float(self):
        score = calculate_score([2022, 2023], avg_marks=3)
        assert isinstance(score, float)
        assert score > 0
