import asyncio
import logging
import time
from fastapi import WebSocket
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

_RATE_WINDOW = 60       # seconds
_RATE_MAX_MSGS = 30     # messages per window


class ConnectionManager:
    def __init__(self):
        # room_id -> {user_id: (WebSocket, pseudonym)}
        self._rooms: Dict[str, Dict[str, Tuple[WebSocket, str]]] = {}
        # user_id -> {"count": int, "window_start": float}
        self._rate: Dict[str, dict] = {}
        self._lock = asyncio.Lock()

    async def connect(
        self, room_id: str, user_id: str, websocket: WebSocket, pseudonym: str
    ) -> None:
        await websocket.accept()
        async with self._lock:
            existing = self._rooms.get(room_id, {}).get(user_id)
            if existing:
                old_ws, _ = existing
                try:
                    await old_ws.close(code=1001)
                except Exception:
                    pass
            self._rooms.setdefault(room_id, {})[user_id] = (websocket, pseudonym)
        logger.info("WS connect room=%s user=%.8s pseudonym=%s", room_id, user_id, pseudonym)

    async def disconnect(self, room_id: str, user_id: str) -> None:
        async with self._lock:
            room = self._rooms.get(room_id, {})
            room.pop(user_id, None)
            if not room:
                self._rooms.pop(room_id, None)
        self._rate.pop(user_id, None)

    async def broadcast(
        self, room_id: str, message: dict, exclude_user: Optional[str] = None
    ) -> None:
        room = dict(self._rooms.get(room_id, {}))
        dead: list[str] = []
        for uid, (ws, _) in room.items():
            if uid == exclude_user:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(uid)
        if dead:
            async with self._lock:
                for uid in dead:
                    self._rooms.get(room_id, {}).pop(uid, None)

    async def send_to(self, room_id: str, user_id: str, message: dict) -> None:
        room = self._rooms.get(room_id, {})
        entry = room.get(user_id)
        if entry:
            ws, _ = entry
            try:
                await ws.send_json(message)
            except Exception:
                async with self._lock:
                    self._rooms.get(room_id, {}).pop(user_id, None)

    def get_participants(self, room_id: str) -> list[dict]:
        return [
            {"pseudonym": pseudonym}
            for _, (_, pseudonym) in self._rooms.get(room_id, {}).items()
        ]

    def participant_count(self, room_id: str) -> int:
        return len(self._rooms.get(room_id, {}))

    def get_pseudonym(self, room_id: str, user_id: str) -> Optional[str]:
        entry = self._rooms.get(room_id, {}).get(user_id)
        return entry[1] if entry else None

    def is_owner(self, room_id: str, user_id: str, websocket: WebSocket) -> bool:
        """True if this websocket is still the active connection for the user in this room."""
        entry = self._rooms.get(room_id, {}).get(user_id)
        return entry is not None and entry[0] is websocket

    def check_rate_limit(self, user_id: str) -> bool:
        """Return True if message is allowed; False if rate-limited."""
        now = time.monotonic()
        rl = self._rate.get(user_id, {"count": 0, "window_start": now})
        if now - rl["window_start"] >= _RATE_WINDOW:
            rl = {"count": 0, "window_start": now}
        if rl["count"] >= _RATE_MAX_MSGS:
            self._rate[user_id] = rl
            return False
        rl["count"] += 1
        self._rate[user_id] = rl
        return True


manager = ConnectionManager()
