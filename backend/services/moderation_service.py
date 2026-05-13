import re

_RAW_PATTERNS = [
    r"f+u+c+k+", r"s+h+i+t+", r"a+s+s+h+o+l+e+", r"b+i+t+c+h+",
    r"c+u+n+t+", r"d+i+c+k+", r"c+o+c+k+\b", r"p+u+s+s+y+",
    r"s+l+u+t+", r"w+h+o+r+e+", r"n+i+g+g+[ae]+r+",
]

_COMPILED = [re.compile(r"\b" + p + r"\b", re.IGNORECASE) for p in _RAW_PATTERNS]

_HTML_RE = re.compile(r"<[^>]+>")

MAX_MESSAGE_LEN = 2000
MAX_ROOM_NAME_LEN = 100
MAX_REASON_LEN = 500


def validate_message(text: str) -> tuple[bool, str]:
    if not text or not text.strip():
        return False, "Empty message"
    if len(text) > MAX_MESSAGE_LEN:
        return False, "Message too long"
    return True, ""


def contains_profanity(text: str) -> bool:
    return any(p.search(text) for p in _COMPILED)


def sanitize_text(text: str, max_len: int) -> str:
    cleaned = _HTML_RE.sub("", text)
    return cleaned.strip()[:max_len]


def sanitize_room_name(name: str) -> str:
    return sanitize_text(name, MAX_ROOM_NAME_LEN)


def sanitize_reason(reason: str) -> str:
    return sanitize_text(reason, MAX_REASON_LEN)
