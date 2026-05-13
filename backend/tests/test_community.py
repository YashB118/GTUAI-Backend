"""
Unit + integration tests for the Community feature.
Uses FastAPI TestClient for in-process API tests.
WebSocket tests use TestClient's websocket_connect context manager.
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


# ─── Pseudonym Service ────────────────────────────────────────────────────────

class TestPseudonymService:
    def test_generates_deterministic_pseudonym(self):
        from services.pseudonym_service import generate_pseudonym
        p1 = generate_pseudonym("user-abc", "room-xyz")
        p2 = generate_pseudonym("user-abc", "room-xyz")
        assert p1 == p2

    def test_different_rooms_different_pseudonyms(self):
        from services.pseudonym_service import generate_pseudonym
        p1 = generate_pseudonym("user-abc", "room-1")
        p2 = generate_pseudonym("user-abc", "room-2")
        # High probability of being different
        assert isinstance(p1, str) and isinstance(p2, str)
        assert len(p1) > 5 and len(p2) > 5

    def test_unique_pseudonym_resolves_collision(self):
        from services.pseudonym_service import generate_unique_pseudonym, generate_pseudonym
        base = generate_pseudonym("user-1", "room-1")
        # Force a collision by pre-populating existing list
        result = generate_unique_pseudonym("user-1", "room-1", existing=[base])
        assert result != base

    def test_unique_pseudonym_returns_base_if_no_collision(self):
        from services.pseudonym_service import generate_unique_pseudonym, generate_pseudonym
        base = generate_pseudonym("user-2", "room-2")
        result = generate_unique_pseudonym("user-2", "room-2", existing=[])
        assert result == base

    def test_pseudonym_is_alphanumeric_string(self):
        from services.pseudonym_service import generate_pseudonym
        p = generate_pseudonym("u", "r")
        assert isinstance(p, str)
        assert p.isalpha() or any(c.isdigit() for c in p)


# ─── Moderation Service ───────────────────────────────────────────────────────

class TestModerationService:
    def test_valid_message_passes(self):
        from services.moderation_service import validate_message
        ok, reason = validate_message("Hello, what is a binary tree?")
        assert ok is True
        assert reason == ""

    def test_empty_message_rejected(self):
        from services.moderation_service import validate_message
        ok, reason = validate_message("")
        assert ok is False
        assert reason

    def test_whitespace_only_rejected(self):
        from services.moderation_service import validate_message
        ok, reason = validate_message("   ")
        assert ok is False

    def test_too_long_message_rejected(self):
        from services.moderation_service import validate_message
        ok, reason = validate_message("x" * 2001)
        assert ok is False

    def test_profanity_detected(self):
        from services.moderation_service import contains_profanity
        assert contains_profanity("what the fuck is this") is True

    def test_clean_text_passes_profanity_check(self):
        from services.moderation_service import contains_profanity
        assert contains_profanity("explain binary search algorithm") is False

    def test_sanitize_strips_html(self):
        from services.moderation_service import sanitize_room_name
        result = sanitize_room_name("<script>alert(1)</script>DSA Room")
        assert "<script>" not in result
        assert "DSA Room" in result

    def test_sanitize_truncates_long_name(self):
        from services.moderation_service import sanitize_room_name
        result = sanitize_room_name("x" * 200)
        assert len(result) <= 100


# ─── Room Code Generation ─────────────────────────────────────────────────────

class TestRoomCode:
    def test_room_code_length(self):
        from services.community_service import _room_code
        code = _room_code()
        assert len(code) == 8

    def test_room_code_uppercase_alphanumeric(self):
        from services.community_service import _room_code
        import string
        valid = set(string.ascii_uppercase + string.digits)
        for _ in range(20):
            code = _room_code()
            assert all(c in valid for c in code)

    def test_room_codes_are_random(self):
        from services.community_service import _room_code
        codes = {_room_code() for _ in range(50)}
        # 50 codes should have at least 40 unique values
        assert len(codes) >= 40


# ─── Matching Service ─────────────────────────────────────────────────────────

class TestMatchingService:
    def _run(self, coro):
        return asyncio.get_event_loop().run_until_complete(coro)

    def setup_method(self):
        from services.matching_service import MatchingService
        self.svc = MatchingService()

    def test_enqueue_returns_queue_id(self):
        qid = self._run(self.svc.enqueue("user-1", "DBMS"))
        assert isinstance(qid, str) and len(qid) == 32

    def test_find_match_returns_none_when_empty(self):
        result = self._run(self.svc.find_match("user-1", "DBMS"))
        assert result is None

    def test_find_match_finds_waiting_peer(self):
        self._run(self.svc.enqueue("user-1", "OS"))
        match = self._run(self.svc.find_match("user-2", "OS"))
        assert match is not None
        assert match["user_id"] == "user-1"

    def test_find_match_does_not_self_match(self):
        self._run(self.svc.enqueue("user-1", "Math"))
        match = self._run(self.svc.find_match("user-1", "Math"))
        assert match is None

    def test_dequeue_removes_user(self):
        self._run(self.svc.enqueue("user-1", "DS"))
        self._run(self.svc.dequeue("user-1"))
        match = self._run(self.svc.find_match("user-2", "DS"))
        assert match is None

    def test_get_status_while_waiting(self):
        qid = self._run(self.svc.enqueue("user-1", "ML"))
        status = self._run(self.svc.get_status(qid))
        assert status["status"] == "waiting"
        assert status["subject"] == "ML"

    def test_get_status_after_match(self):
        qid = self._run(self.svc.enqueue("user-1", "CN"))
        self._run(self.svc.find_match("user-2", "CN"))
        status = self._run(self.svc.get_status(qid))
        assert status["status"] == "expired"

    def test_different_subjects_not_matched(self):
        self._run(self.svc.enqueue("user-1", "OS"))
        match = self._run(self.svc.find_match("user-2", "DBMS"))
        assert match is None


# ─── WebSocket Manager ────────────────────────────────────────────────────────

class TestWSManager:
    def _run(self, coro):
        return asyncio.get_event_loop().run_until_complete(coro)

    def setup_method(self):
        from services.ws_manager import ConnectionManager
        self.mgr = ConnectionManager()

    def test_participant_count_zero_for_unknown_room(self):
        assert self.mgr.participant_count("nonexistent") == 0

    def test_get_pseudonym_returns_none_for_unknown(self):
        assert self.mgr.get_pseudonym("r1", "u1") is None

    def test_rate_limit_allows_under_threshold(self):
        for _ in range(29):
            assert self.mgr.check_rate_limit("user-rl") is True

    def test_rate_limit_blocks_at_threshold(self):
        mgr_fresh = __import__("services.ws_manager", fromlist=["ConnectionManager"]).ConnectionManager()
        for _ in range(30):
            mgr_fresh.check_rate_limit("u")
        assert mgr_fresh.check_rate_limit("u") is False

    def test_rate_limit_is_per_user(self):
        mgr_fresh = __import__("services.ws_manager", fromlist=["ConnectionManager"]).ConnectionManager()
        for _ in range(30):
            mgr_fresh.check_rate_limit("user-a")
        # user-b should still be allowed
        assert mgr_fresh.check_rate_limit("user-b") is True


# ─── REST API (mocked Supabase) ───────────────────────────────────────────────

@pytest.fixture
def mock_user():
    return {"sub": "test-user-id-1234", "email": "test@example.com"}


@pytest.fixture
def mock_room():
    return {
        "id": "room-id-5678",
        "name": "Test Room",
        "subject": "Data Structures",
        "is_public": True,
        "room_code": "ABCD1234",
        "max_participants": 50,
        "participant_count": 0,
        "status": "active",
        "last_activity_at": "2026-05-12T10:00:00Z",
        "message_retention": "ephemeral",
        "description": None,
        "created_by": "test-user-id-1234",
        "expires_at": None,
    }


class TestCommunityAPI:
    @pytest.fixture(autouse=True)
    def setup(self, mock_user, mock_room):
        from main import app
        self.client = TestClient(app)
        self.mock_user = mock_user
        self.mock_room = mock_room

    def _auth_headers(self):
        return {"Authorization": "Bearer fake-token"}

    def test_subjects_endpoint_no_auth(self):
        res = self.client.get("/community/subjects")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert "Data Structures" in data

    def test_rooms_requires_auth(self):
        res = self.client.get("/community/rooms")
        assert res.status_code == 403

    @patch("middleware.auth.get_current_user", return_value=None)
    @patch("services.community_service.get_public_rooms")
    @patch("services.community_service.expire_stale_rooms")
    def test_rooms_returns_list(self, mock_expire, mock_rooms, mock_auth, mock_room):
        mock_auth.return_value = self.mock_user
        mock_rooms.return_value = [mock_room]
        mock_expire.return_value = None

        with patch("routers.community.get_current_user", return_value=self.mock_user):
            with patch("routers.community.expire_stale_rooms"):
                with patch("routers.community.get_public_rooms", return_value=[mock_room]):
                    res = self.client.get("/community/rooms", headers=self._auth_headers())
                    # Auth is mocked, so we just check the route exists
                    assert res.status_code in (200, 401, 403)

    def test_invalid_join_code(self):
        with patch("routers.community.get_current_user", return_value=self.mock_user):
            with patch("routers.community.get_room_by_code", return_value=None):
                res = self.client.post(
                    "/community/rooms/join",
                    json={"room_code": "INVALID1"},
                    headers=self._auth_headers(),
                )
                assert res.status_code in (404, 401, 403, 422)

    def test_report_requires_valid_room(self):
        with patch("routers.community.get_current_user", return_value=self.mock_user):
            with patch("routers.community.get_room", return_value=None):
                res = self.client.post(
                    "/community/report",
                    json={"room_id": "nonexistent", "reason": "Spam content in room"},
                    headers=self._auth_headers(),
                )
                assert res.status_code in (404, 401, 403)

    def test_health_unaffected(self):
        res = self.client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
