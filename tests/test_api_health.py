"""
Basic API tests — just checks the server responds correctly.
Run with: cd backend && .venv/bin/python -m pytest tests/test_api_health.py -v
Requires the server to NOT be running (uses TestClient, no network needed).
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient


def get_client():
    from main import app
    return TestClient(app)


def test_health_endpoint():
    client = get_client()
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_subjects_requires_auth():
    client = get_client()
    response = client.get("/subjects/")
    assert response.status_code in (401, 403)


def test_predictions_requires_auth():
    client = get_client()
    response = client.get("/predictions/some-id")
    assert response.status_code in (401, 403)


def test_papers_upload_requires_auth():
    client = get_client()
    response = client.post("/papers/upload", data={})
    assert response.status_code in (401, 403, 422)
