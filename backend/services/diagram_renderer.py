"""
Kroki.io server-side renderer for Graphviz/non-Mermaid diagram types.
Mermaid diagrams render in-browser via Mermaid.js (free, unlimited).
Kroki renders count toward the 20/user/day limit.
"""
from __future__ import annotations
import base64
import logging
import zlib

import httpx

logger = logging.getLogger(__name__)

KROKI_BASE = "https://kroki.io"
_TIMEOUT   = 10.0  # seconds


def render_graphviz_svg(dot_code: str) -> str | None:
    """
    Encode DOT code and call Kroki.io to get an SVG string.
    Returns None on failure.
    """
    return _kroki_render(dot_code, engine="graphviz", fmt="svg")


def render_mermaid_svg(mermaid_code: str) -> str | None:
    """Server-side Mermaid render via Kroki (used for PDF export only)."""
    return _kroki_render(mermaid_code, engine="mermaid", fmt="svg")


def _kroki_render(dsl: str, engine: str, fmt: str) -> str | None:
    encoded = _encode_dsl(dsl)
    url     = f"{KROKI_BASE}/{engine}/{fmt}/{encoded}"
    try:
        resp = httpx.get(url, timeout=_TIMEOUT)
        resp.raise_for_status()
        return resp.text
    except httpx.HTTPStatusError as e:
        logger.warning(f"Kroki HTTP error {e.response.status_code} for {engine}")
        return None
    except Exception as e:
        logger.warning(f"Kroki render failed ({engine}): {e}")
        return None


def _encode_dsl(dsl: str) -> str:
    compressed = zlib.compress(dsl.encode("utf-8"), level=9)
    return base64.urlsafe_b64encode(compressed).decode("ascii")
