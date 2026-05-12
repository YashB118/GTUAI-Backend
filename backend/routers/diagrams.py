"""Diagram generation router — Phase 8."""
from __future__ import annotations
import hashlib
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import get_supabase
from middleware.auth import get_current_user

router = APIRouter(prefix="/diagrams", tags=["diagrams"])
logger = logging.getLogger(__name__)

DAILY_SERVER_RENDER_LIMIT = 20


class DiagramRequest(BaseModel):
    question_text: str
    subject_id:    str
    diagram_type:  str = "block"
    render_server: bool = False   # True = Kroki SVG; False = return DSL for browser Mermaid


class DiagramResponse(BaseModel):
    engine:         str
    dsl:            str
    fallback_ascii: str
    svg:            str | None = None
    cached:         bool = False
    diagram_type:   str


@router.post("/generate", response_model=DiagramResponse)
async def generate_diagram(
    req: DiagramRequest,
    user=Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    from services.diagram_engine import generate_diagram_dsl
    from services.diagram_renderer import render_graphviz_svg, render_mermaid_svg

    q_hash = hashlib.sha256(
        f"{req.question_text.strip().lower()}:{req.diagram_type}".encode()
    ).hexdigest()

    # Check cache
    cached = (
        supabase.table("diagram_cache")
        .select("engine, dsl_code, fallback_ascii, svg_data, diagram_type")
        .eq("question_hash", q_hash)
        .limit(1)
        .execute()
    )
    if cached.data:
        row = cached.data[0]
        return DiagramResponse(
            engine=row["engine"],
            dsl=row["dsl_code"],
            fallback_ascii=row.get("fallback_ascii") or "",
            svg=row.get("svg_data"),
            cached=True,
            diagram_type=row["diagram_type"],
        )

    # Check server-render rate limit (Kroki calls only)
    if req.render_server:
        today = date.today().isoformat()
        limit_res = (
            supabase.table("diagram_rate_limits")
            .select("server_renders")
            .eq("user_id", str(user["id"]))
            .eq("date", today)
            .limit(1)
            .execute()
        )
        current_renders = (limit_res.data[0]["server_renders"] if limit_res.data else 0)
        if current_renders >= DAILY_SERVER_RENDER_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=f"Daily server render limit ({DAILY_SERVER_RENDER_LIMIT}) reached. "
                       "Diagram DSL returned for browser rendering.",
            )

    # Generate DSL
    result = generate_diagram_dsl(
        question=req.question_text,
        diagram_type=req.diagram_type,
        subject_context=req.subject_id,
    )

    engine        = result["engine"]
    dsl           = result["dsl"]
    fallback_ascii = result["fallback_ascii"]
    svg: str | None = None

    # Server-side render via Kroki
    if req.render_server:
        if engine == "graphviz":
            svg = render_graphviz_svg(dsl)
        elif engine == "mermaid":
            svg = render_mermaid_svg(dsl)
        # ASCII diagrams don't need server render

        if svg:
            try:
                supabase.rpc("increment_diagram_renders", {
                    "p_user_id": str(user["id"]),
                    "p_date":    date.today().isoformat(),
                }).execute()
            except Exception as e:
                logger.warning(f"Rate limit increment failed: {e}")

    # Store in cache
    try:
        supabase.table("diagram_cache").insert({
            "question_hash": q_hash,
            "diagram_type":  req.diagram_type,
            "render_engine": engine,
            "dsl_code":      dsl,
            "fallback_ascii": fallback_ascii,
            "svg_data":      svg,
        }).execute()
    except Exception as e:
        logger.warning(f"Diagram cache insert failed: {e}")

    return DiagramResponse(
        engine=engine,
        dsl=dsl,
        fallback_ascii=fallback_ascii,
        svg=svg,
        cached=False,
        diagram_type=req.diagram_type,
    )


@router.get("/detect-type")
async def detect_diagram_type(question: str, user=Depends(get_current_user)):
    from services.question_intent import detect_question_intent
    intent = detect_question_intent(question)
    return {
        "requires_diagram": intent.requires_diagram,
        "diagram_type":     intent.diagram_type,
        "template":         intent.template,
    }
