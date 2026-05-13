import logging
import secrets
import string
from datetime import datetime, timezone, timedelta
from typing import Optional

from database import get_supabase
from services.pseudonym_service import generate_unique_pseudonym
from services.moderation_service import sanitize_room_name, sanitize_reason

logger = logging.getLogger(__name__)

PUBLIC_SUBJECTS = [
    "Data Structures",
    "DBMS",
    "Operating Systems",
    "Mathematics",
    "Machine Learning",
    "Computer Networks",
    "Software Engineering",
    "Web Development",
    "Algorithms",
    "Object-Oriented Programming",
    "Theory of Computation",
    "Compiler Design",
    "Computer Architecture",
    "Digital Electronics",
    "Microprocessors",
]

_CODE_CHARS = string.ascii_uppercase + string.digits


def _room_code() -> str:
    return "".join(secrets.choice(_CODE_CHARS) for _ in range(8))


# ─── Rooms ────────────────────────────────────────────────────────────────────

def create_room(
    name: str,
    subject: str,
    description: Optional[str],
    is_public: bool,
    max_participants: int,
    expires_in_hours: Optional[int],
    message_retention: str,
    created_by: str,
) -> dict:
    supabase = get_supabase()
    if message_retention not in ("ephemeral", "timed", "permanent"):
        message_retention = "ephemeral"
    data: dict = {
        "name": sanitize_room_name(name),
        "subject": subject,
        "description": description,
        "is_public": is_public,
        "room_code": _room_code(),
        "max_participants": max(2, min(max_participants, 100)),
        "created_by": created_by,
        "message_retention": message_retention,
    }
    if expires_in_hours:
        data["expires_at"] = (
            datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
        ).isoformat()
    res = supabase.table("community_rooms").insert(data).execute()
    if not res.data:
        raise ValueError("Failed to create room")
    return res.data[0]


def get_public_rooms(subject: Optional[str] = None, limit: int = 50) -> list[dict]:
    supabase = get_supabase()
    q = (
        supabase.table("community_rooms")
        .select("*")
        .eq("is_public", True)
        .eq("status", "active")
        .order("last_activity_at", desc=True)
        .limit(limit)
    )
    if subject:
        q = q.eq("subject", subject)
    return q.execute().data or []


def get_room(room_id: str) -> Optional[dict]:
    supabase = get_supabase()
    res = (
        supabase.table("community_rooms")
        .select("*")
        .eq("id", room_id)
        .eq("status", "active")
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def get_room_by_code(room_code: str) -> Optional[dict]:
    supabase = get_supabase()
    res = (
        supabase.table("community_rooms")
        .select("*")
        .eq("room_code", room_code.upper())
        .eq("status", "active")
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def soft_delete_room(room_id: str, user_id: str) -> bool:
    room = get_room(room_id)
    if not room or room.get("created_by") != user_id:
        return False
    get_supabase().table("community_rooms").update({"status": "deleted"}).eq("id", room_id).execute()
    return True


def expire_stale_rooms() -> None:
    try:
        now = datetime.now(timezone.utc).isoformat()
        get_supabase().table("community_rooms").update({"status": "expired"}).lt("expires_at", now).eq("status", "active").execute()
    except Exception as e:
        logger.warning("Room expiry failed: %s", e)


# ─── Participants ─────────────────────────────────────────────────────────────

def get_or_create_pseudonym(user_id: str, room_id: str) -> str:
    supabase = get_supabase()
    res = (
        supabase.table("community_participants")
        .select("pseudonym")
        .eq("room_id", room_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if res.data:
        # Refresh last_seen
        supabase.table("community_participants").update(
            {"last_seen_at": datetime.now(timezone.utc).isoformat()}
        ).eq("room_id", room_id).eq("user_id", user_id).execute()
        return res.data[0]["pseudonym"]

    existing_res = (
        supabase.table("community_participants")
        .select("pseudonym")
        .eq("room_id", room_id)
        .execute()
    )
    existing = [r["pseudonym"] for r in (existing_res.data or [])]
    pseudonym = generate_unique_pseudonym(user_id, room_id, existing)

    supabase.table("community_participants").upsert(
        {
            "room_id": room_id,
            "user_id": user_id,
            "pseudonym": pseudonym,
            "last_seen_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="room_id,user_id",
    ).execute()
    return pseudonym


def update_participant_count(room_id: str, delta: int) -> None:
    supabase = get_supabase()
    try:
        room = get_room(room_id)
        if not room:
            return
        new_count = max(0, (room.get("participant_count") or 0) + delta)
        supabase.table("community_rooms").update(
            {
                "participant_count": new_count,
                "last_activity_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", room_id).execute()
    except Exception as e:
        logger.warning("participant_count update failed: %s", e)


def update_last_activity(room_id: str) -> None:
    try:
        get_supabase().table("community_rooms").update(
            {"last_activity_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", room_id).execute()
    except Exception as e:
        logger.warning("last_activity update failed: %s", e)


# ─── Messages ─────────────────────────────────────────────────────────────────

def get_recent_messages(room_id: str, limit: int = 50) -> list[dict]:
    supabase = get_supabase()
    res = (
        supabase.table("community_messages")
        .select("id, sender_pseudonym, ciphertext, iv, created_at")
        .eq("room_id", room_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return list(reversed(res.data or []))


def store_message(room_id: str, sender_pseudonym: str, ciphertext: str, iv: str) -> dict:
    res = get_supabase().table("community_messages").insert(
        {"room_id": room_id, "sender_pseudonym": sender_pseudonym, "ciphertext": ciphertext, "iv": iv}
    ).execute()
    if not res.data:
        raise ValueError("Failed to store message")
    return res.data[0]


# ─── Reports ──────────────────────────────────────────────────────────────────

def create_report(room_id: str, reporter_user_id: str, reason: str) -> dict:
    res = get_supabase().table("community_reports").upsert(
        {
            "room_id": room_id,
            "reporter_user_id": reporter_user_id,
            "reason": sanitize_reason(reason),
        },
        on_conflict="room_id,reporter_user_id",
    ).execute()
    if not res.data:
        raise ValueError("Failed to create report")
    return res.data[0]
