import logging
import secrets
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field, field_validator

from middleware.auth import get_current_user
from middleware.limiter import limiter
from services.community_service import (
    PUBLIC_SUBJECTS,
    create_room,
    get_public_rooms,
    get_room,
    get_room_by_code,
    get_or_create_pseudonym,
    get_recent_messages,
    store_message,
    create_report,
    soft_delete_room,
    update_participant_count,
    update_last_activity,
    expire_stale_rooms,
)
from services.ws_manager import manager
from services.matching_service import matching_service

router = APIRouter(prefix="/community", tags=["community"])
logger = logging.getLogger(__name__)

# ─── Request Models ───────────────────────────────────────────────────────────

class CreateRoomRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    subject: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: bool = True
    max_participants: int = Field(default=50, ge=2, le=100)
    expires_in_hours: Optional[int] = Field(None, ge=1, le=168)
    message_retention: str = Field(default="ephemeral")

    @field_validator("message_retention")
    @classmethod
    def _retention(cls, v: str) -> str:
        if v not in ("ephemeral", "timed", "permanent"):
            return "ephemeral"
        return v


class JoinByCodeRequest(BaseModel):
    room_code: str = Field(..., min_length=4, max_length=20)


class RandomMatchRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=100)


class ReportRequest(BaseModel):
    room_id: str
    reason: str = Field(..., min_length=5, max_length=500)


# ─── REST ─────────────────────────────────────────────────────────────────────

@router.get("/subjects")
async def list_subjects():
    return PUBLIC_SUBJECTS


@router.get("/rooms")
@limiter.limit("60/minute")
async def list_rooms(
    request: Request,
    subject: Optional[str] = None,
    _user=Depends(get_current_user),
):
    expire_stale_rooms()
    rooms = get_public_rooms(subject=subject)
    for room in rooms:
        live = manager.participant_count(room["id"])
        if live > 0:
            room["participant_count"] = live
    return rooms


@router.post("/rooms")
@limiter.limit("10/minute")
async def create_community_room(
    request: Request,
    req: CreateRoomRequest,
    user=Depends(get_current_user),
):
    try:
        return create_room(
            name=req.name,
            subject=req.subject,
            description=req.description,
            is_public=req.is_public,
            max_participants=req.max_participants,
            expires_in_hours=req.expires_in_hours,
            message_retention=req.message_retention,
            created_by=user["sub"],
        )
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/rooms/join")
@limiter.limit("20/minute")
async def join_by_code(
    request: Request,
    req: JoinByCodeRequest,
    user=Depends(get_current_user),
):
    room = get_room_by_code(req.room_code)
    if not room:
        raise HTTPException(404, "Room not found or expired")
    if manager.participant_count(room["id"]) >= room.get("max_participants", 50):
        raise HTTPException(400, "Room is full")
    return {"room_id": room["id"], "room": room}


@router.get("/rooms/{room_id}")
async def get_room_details(room_id: str, user=Depends(get_current_user)):
    room = get_room(room_id)
    if not room:
        raise HTTPException(404, "Room not found")
    live = manager.participant_count(room_id)
    if live > 0:
        room["participant_count"] = live
    return room


@router.delete("/rooms/{room_id}")
async def delete_room(room_id: str, user=Depends(get_current_user)):
    if not soft_delete_room(room_id, user["sub"]):
        raise HTTPException(403, "Not authorized or room not found")
    return {"success": True}


@router.post("/random-match")
@limiter.limit("10/minute")
async def random_match(
    request: Request,
    req: RandomMatchRequest,
    user=Depends(get_current_user),
):
    user_id = user["sub"]
    match = await matching_service.find_match(user_id, req.subject)
    if match:
        try:
            room = create_room(
                name=f"{req.subject} Study Session",
                subject=req.subject,
                description="Auto-matched anonymous study session",
                is_public=False,
                max_participants=2,
                expires_in_hours=2,
                message_retention="ephemeral",
                created_by=user_id,
            )
            return {"status": "matched", "room_id": room["id"], "room_code": room["room_code"]}
        except Exception as e:
            logger.error("Create match room failed: %s", e)
            raise HTTPException(500, "Failed to create room")

    queue_id = await matching_service.enqueue(user_id, req.subject)
    return {"status": "queued", "queue_id": queue_id}


@router.get("/match-status/{queue_id}")
async def match_status(queue_id: str, user=Depends(get_current_user)):
    status = await matching_service.get_status(queue_id)
    if status["status"] == "expired":
        await matching_service.dequeue(user["sub"])
    return status


@router.delete("/match-queue")
async def leave_match_queue(user=Depends(get_current_user)):
    await matching_service.dequeue(user["sub"])
    return {"success": True}


@router.post("/report")
@limiter.limit("5/minute")
async def report_room(
    request: Request,
    req: ReportRequest,
    user=Depends(get_current_user),
):
    if not get_room(req.room_id):
        raise HTTPException(404, "Room not found")
    try:
        create_report(req.room_id, user["sub"], req.reason)
        return {"success": True}
    except Exception as e:
        raise HTTPException(400, str(e))


# ─── WebSocket ────────────────────────────────────────────────────────────────

async def _authenticate_ws(token: str) -> dict:
    from middleware.auth import _get_jwks_client
    import jwt as pyjwt
    try:
        client = _get_jwks_client()
        signing_key = client.get_signing_key_from_jwt(token)
        return pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256", "HS256"],
            options={"verify_exp": True},
            audience="authenticated",
        )
    except Exception as exc:
        raise ValueError("Invalid token") from exc


@router.websocket("/ws/{room_id}")
async def community_websocket(
    websocket: WebSocket,
    room_id: str,
    token: str = Query(...),
):
    # ── Auth ──────────────────────────────────────────────────────────────────
    try:
        user = await _authenticate_ws(token)
    except ValueError:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    user_id: str = user["sub"]

    # ── Room validation ───────────────────────────────────────────────────────
    room = get_room(room_id)
    if not room:
        await websocket.close(code=4004, reason="Room not found")
        return

    if manager.participant_count(room_id) >= room.get("max_participants", 50):
        await websocket.close(code=4003, reason="Room full")
        return

    # ── Pseudonym ─────────────────────────────────────────────────────────────
    try:
        pseudonym = get_or_create_pseudonym(user_id, room_id)
    except Exception as e:
        logger.error("Pseudonym assignment failed: %s", e)
        await websocket.close(code=4500, reason="Server error")
        return

    # ── Connect ───────────────────────────────────────────────────────────────
    await manager.connect(room_id, user_id, websocket, pseudonym)
    update_participant_count(room_id, +1)

    # Send initial room state (history only if retention != ephemeral)
    history: list[dict] = []
    if room.get("message_retention") != "ephemeral":
        try:
            history = get_recent_messages(room_id, limit=50)
        except Exception:
            pass

    await websocket.send_json({
        "type": "room_state",
        "room": {
            "id": room["id"],
            "name": room["name"],
            "subject": room["subject"],
            "room_code": room["room_code"],
            "message_retention": room.get("message_retention", "ephemeral"),
            "is_public": room.get("is_public", True),
        },
        "my_pseudonym": pseudonym,
        "participants": manager.get_participants(room_id),
        "messages": history,
    })

    await manager.broadcast(
        room_id,
        {
            "type": "user_joined",
            "pseudonym": pseudonym,
            "participant_count": manager.participant_count(room_id),
        },
        exclude_user=user_id,
    )

    # ── Message loop ──────────────────────────────────────────────────────────
    try:
        while True:
            try:
                data = await websocket.receive_json()
            except Exception:
                break

            event = data.get("type", "")

            if event == "ping":
                await websocket.send_json({"type": "pong"})

            elif event == "send_message":
                if not manager.check_rate_limit(user_id):
                    await websocket.send_json({"type": "error", "message": "Rate limited. Slow down."})
                    continue

                ciphertext = (data.get("ciphertext") or "").strip()
                iv = (data.get("iv") or "").strip()
                temp_id = data.get("temp_id", "")

                if not ciphertext or not iv:
                    await websocket.send_json({"type": "error", "message": "Missing ciphertext or IV"})
                    continue
                if len(ciphertext) > 10_000:
                    await websocket.send_json({"type": "error", "message": "Payload too large"})
                    continue

                # Persist only when retention is not ephemeral
                msg_id = secrets.token_hex(8)
                if room.get("message_retention") != "ephemeral":
                    try:
                        stored = store_message(room_id, pseudonym, ciphertext, iv)
                        msg_id = stored["id"]
                    except Exception as e:
                        logger.warning("Message store failed: %s", e)

                update_last_activity(room_id)
                now_iso = datetime.now(timezone.utc).isoformat()

                msg_event = {
                    "type": "message",
                    "id": msg_id,
                    "temp_id": temp_id,
                    "pseudonym": pseudonym,
                    "ciphertext": ciphertext,
                    "iv": iv,
                    "timestamp": now_iso,
                }

                # Broadcast to others, ack to sender
                await manager.broadcast(room_id, msg_event, exclude_user=user_id)
                await websocket.send_json({
                    "type": "message_ack",
                    "temp_id": temp_id,
                    "id": msg_id,
                    "timestamp": now_iso,
                })

            elif event == "typing_start":
                await manager.broadcast(room_id, {"type": "typing_start", "pseudonym": pseudonym}, exclude_user=user_id)

            elif event == "typing_stop":
                await manager.broadcast(room_id, {"type": "typing_stop", "pseudonym": pseudonym}, exclude_user=user_id)

            elif event == "presence_ping":
                await websocket.send_json({
                    "type": "presence_update",
                    "participants": manager.get_participants(room_id),
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("WebSocket loop error: %s", e)
    finally:
        # Only clean up if this websocket is still the registered one.
        # If the user reconnected, a new WS already replaced this one — skip to
        # avoid ghost "user_left" broadcasts and double participant_count decrements.
        if manager.is_owner(room_id, user_id, websocket):
            exit_pseudonym = manager.get_pseudonym(room_id, user_id) or pseudonym
            await manager.disconnect(room_id, user_id)
            update_participant_count(room_id, -1)
            await manager.broadcast(room_id, {
                "type": "user_left",
                "pseudonym": exit_pseudonym,
                "participant_count": manager.participant_count(room_id),
            })
        logger.info("WS disconnect room=%s user=%.8s", room_id, user_id)
