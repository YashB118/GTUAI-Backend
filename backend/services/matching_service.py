import asyncio
import logging
import secrets
import time
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

_MATCH_TIMEOUT_SEC = 60


class MatchingService:
    def __init__(self):
        # subject -> list of {user_id, queue_id, timestamp}
        self._queues: Dict[str, List[dict]] = {}
        self._lock = asyncio.Lock()

    async def enqueue(self, user_id: str, subject: str) -> str:
        queue_id = secrets.token_hex(16)
        async with self._lock:
            self._remove_user_unlocked(user_id)
            self._queues.setdefault(subject, []).append({
                "user_id": user_id,
                "queue_id": queue_id,
                "timestamp": time.monotonic(),
            })
        logger.info("Enqueued user=%.8s subject=%s", user_id, subject)
        return queue_id

    async def find_match(self, user_id: str, subject: str) -> Optional[dict]:
        """Pop and return a waiting peer, or None if queue empty."""
        async with self._lock:
            queue = self._queues.get(subject, [])
            now = time.monotonic()
            # Purge stale + self
            queue[:] = [
                e for e in queue
                if e["user_id"] != user_id
                and now - e["timestamp"] < _MATCH_TIMEOUT_SEC
            ]
            if not queue:
                return None
            match = queue.pop(0)
            if not queue:
                self._queues.pop(subject, None)
        logger.info("Matched user=%.8s with %.8s subject=%s", user_id, match["user_id"], subject)
        return match

    async def dequeue(self, user_id: str) -> None:
        async with self._lock:
            self._remove_user_unlocked(user_id)

    async def get_status(self, queue_id: str) -> dict:
        now = time.monotonic()
        async with self._lock:
            for subject, queue in self._queues.items():
                for entry in queue:
                    if entry["queue_id"] == queue_id:
                        return {
                            "status": "waiting",
                            "wait_seconds": int(now - entry["timestamp"]),
                            "subject": subject,
                        }
        return {"status": "expired"}

    def _remove_user_unlocked(self, user_id: str) -> None:
        for subject, queue in list(self._queues.items()):
            queue[:] = [e for e in queue if e["user_id"] != user_id]
            if not queue:
                self._queues.pop(subject, None)


matching_service = MatchingService()
