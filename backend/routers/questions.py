import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from database import get_supabase
from middleware.auth import get_current_user

router = APIRouter(prefix="/questions", tags=["questions"])
logger = logging.getLogger(__name__)


@router.get("/ai-answer")
async def get_ai_answer(
    question: str = Query(..., min_length=5),
    user=Depends(get_current_user),
):
    """Generate a model answer for a single question on demand.
    Uses Groq (preferred) or Gemini (fallback) via services.llm.
    """
    from services.llm import generate_text

    prompt = f"""You are a GTU exam preparation expert. Write a clear, well-structured model answer for the following exam question.
Format your answer with:
- A brief 1-2 sentence overview
- Key points or steps (use bullet points or numbered list where appropriate)
- Any important definitions, formulas, or examples

Question: {question}

Answer:"""

    try:
        answer_text = generate_text(prompt)
        return {"answer": answer_text}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"Answer generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Answer generation failed: {str(e)}")


@router.get("/{subject_id}")
async def list_questions(
    subject_id: str,
    year: Optional[int] = Query(None),
    unit: Optional[int] = Query(None),
    question_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    user=Depends(get_current_user),
):
    supabase = get_supabase()
    query = (
        supabase.table("questions")
        .select("id, text, marks, unit_number, question_type, question_papers(year, exam_type)")
        .eq("subject_id", subject_id)
        .order("created_at", desc=True)
    )
    if unit is not None:
        query = query.eq("unit_number", unit)
    if question_type:
        query = query.eq("question_type", question_type)

    res = query.range(skip, skip + limit - 1).execute()
    data = res.data or []

    if year is not None:
        data = [q for q in data if (q.get("question_papers") or {}).get("year") == year]

    return data
