"""
App-level settings persisted in Supabase (`app_settings` key/value table).
Currently used for prediction scoring weights.
"""
import logging
import time
from database import get_supabase

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS = {
    "frequency": 40.0,
    "recency": 30.0,
    "consecutive": 20.0,
    "marks": 10.0,
}

_KEY = "prediction_weights"
_cache: dict | None = None
_cache_ts: float = 0.0
_TTL = 60  # seconds


def _normalize(weights: dict) -> dict:
    """Force valid float values for all 4 keys, fall back to defaults if missing."""
    out = dict(DEFAULT_WEIGHTS)
    for k in DEFAULT_WEIGHTS:
        v = weights.get(k)
        if isinstance(v, (int, float)) and v >= 0:
            out[k] = float(v)
    return out


def get_prediction_weights() -> dict:
    global _cache, _cache_ts
    if _cache is not None and (time.time() - _cache_ts) < _TTL:
        return _cache
    try:
        supabase = get_supabase()
        res = (
            supabase.table("app_settings")
            .select("value")
            .eq("key", _KEY)
            .maybe_single()
            .execute()
        )
        if res.data and isinstance(res.data.get("value"), dict):
            _cache = _normalize(res.data["value"])
        else:
            _cache = dict(DEFAULT_WEIGHTS)
    except Exception as e:
        logger.warning(f"Could not load prediction weights, using defaults: {e}")
        _cache = dict(DEFAULT_WEIGHTS)
    _cache_ts = time.time()
    return _cache


def set_prediction_weights(weights: dict) -> dict:
    global _cache, _cache_ts
    norm = _normalize(weights)
    try:
        supabase = get_supabase()
        # upsert by key
        supabase.table("app_settings").upsert(
            {"key": _KEY, "value": norm},
            on_conflict="key",
        ).execute()
    except Exception as e:
        logger.warning(f"Could not persist prediction weights: {e}")
    _cache = norm
    _cache_ts = time.time()
    return norm


def invalidate_weights_cache() -> None:
    global _cache, _cache_ts
    _cache = None
    _cache_ts = 0.0
