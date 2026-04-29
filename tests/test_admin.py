"""
Phase 4 admin endpoint tests.
Run with: cd backend && .venv/bin/python -m pytest tests/test_admin.py -v
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


# ─── Auth gate ──────────────────────────────────────────────────────────────


def test_admin_overview_requires_auth(client):
    res = client.get("/admin/analytics/overview")
    assert res.status_code in (401, 403)


def test_admin_users_requires_auth(client):
    res = client.get("/admin/users")
    assert res.status_code in (401, 403)


def test_admin_materials_requires_auth(client):
    res = client.get("/admin/materials")
    assert res.status_code in (401, 403)


def test_admin_paper_upload_requires_auth(client):
    res = client.post("/admin/papers/upload", data={})
    assert res.status_code in (401, 403, 422)


def test_admin_promote_requires_auth(client):
    res = client.patch("/admin/users/some-id/promote")
    assert res.status_code in (401, 403)


def test_admin_weights_requires_auth(client):
    res = client.get("/admin/predictions/weights")
    assert res.status_code in (401, 403)


def test_admin_export_csv_requires_auth(client):
    res = client.get("/admin/users/export-csv")
    assert res.status_code in (401, 403)


# ─── Schema validation (without auth, validation runs after auth) ───────────


def test_admin_bulk_approve_validation(client):
    # 401/403 because no auth
    res = client.post("/admin/materials/bulk-approve", json={"material_ids": []})
    assert res.status_code in (401, 403, 422)


def test_admin_uploads_chart_param_clamp(client):
    res = client.get("/admin/analytics/uploads-chart?days=200")
    # Days max=90, expect validation error if no auth (still hits validation)
    assert res.status_code in (401, 403, 422)


# ─── Settings service unit tests (no DB needed) ─────────────────────────────


def test_settings_normalize_drops_invalid_values():
    from services.settings_service import _normalize, DEFAULT_WEIGHTS
    out = _normalize({"frequency": -5, "recency": "bad", "consecutive": 25, "marks": 12.5})
    # Negative and string fall back to defaults
    assert out["frequency"] == DEFAULT_WEIGHTS["frequency"]
    assert out["recency"] == DEFAULT_WEIGHTS["recency"]
    # Valid passes through
    assert out["consecutive"] == 25.0
    assert out["marks"] == 12.5


def test_settings_normalize_returns_all_keys():
    from services.settings_service import _normalize, DEFAULT_WEIGHTS
    out = _normalize({})
    assert set(out.keys()) == set(DEFAULT_WEIGHTS.keys())


# ─── Email service ──────────────────────────────────────────────────────────


def test_email_disabled_when_no_key(monkeypatch):
    from config import settings
    monkeypatch.setattr(settings, "resend_api_key", "")
    from services import email_service
    assert email_service.is_email_enabled() is False
    # Sending returns False but does not raise
    assert email_service.notify_material_approved("test@example.com", "X") is False
    assert email_service.notify_material_rejected("test@example.com", "X", "no") is False


# ─── Score calculation with custom weights ──────────────────────────────────


def test_calculate_score_respects_custom_weights():
    from services.prediction_engine import calculate_score
    custom = {"frequency": 100, "recency": 0, "consecutive": 0, "marks": 0}
    score = calculate_score([2018, 2019, 2020, 2021], avg_marks=7, weights=custom)
    # 4/8 frequency = 50% × 100 = 50
    assert 49 <= score <= 51


def test_calculate_score_zero_weights_returns_zero():
    from services.prediction_engine import calculate_score
    zero = {"frequency": 0, "recency": 0, "consecutive": 0, "marks": 0}
    score = calculate_score([2020, 2021, 2022], avg_marks=7, weights=zero)
    assert score == 0.0
