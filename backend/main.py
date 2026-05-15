import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from config import settings
from middleware.limiter import limiter
from routers import auth, papers, materials
from routers import subjects, predictions, questions, answers, admin, chat, testimonials
# from routers import oracle  # Brahmastra disabled — to be rebuilt as standalone feature
from routers import coins, challenges, coupons, admin_coins, diagrams, community, news
from routers.coins import streaks_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

if settings.sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        environment="production",
    )

app = FastAPI(
    title="GTU ExamAI API",
    version="5.0.0",
    description="Backend API for GTU ExamAI — AI-powered exam prediction platform",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_localhost_origins = [f"http://localhost:{p}" for p in range(3000, 3010)]
_production_origins = [
    "https://gtuai-frontend-qipq.vercel.app",
]

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(settings.allowed_origins + _localhost_origins + _production_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

app.include_router(auth.router)
app.include_router(papers.router)
app.include_router(materials.router)
app.include_router(subjects.router)
app.include_router(predictions.router)
app.include_router(questions.router)
app.include_router(answers.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(testimonials.router)
# app.include_router(oracle.router)  # Brahmastra disabled — to be rebuilt as standalone feature
app.include_router(coins.router)
app.include_router(streaks_router)
app.include_router(challenges.router)
app.include_router(coupons.router)
app.include_router(admin_coins.router)
app.include_router(diagrams.router)
app.include_router(community.router)
app.include_router(news.router)


@app.on_event("startup")
async def startup_event():
    import asyncio
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, lambda: __import__("services.pdf_processor", fromlist=["get_embedder"]).get_embedder())
        logger.info("Embedding model preloaded")
    except Exception as e:
        logger.warning(f"Could not preload embedding model: {e}")


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


@app.post("/contact")
async def contact_us(data: ContactRequest):
    from services.email_service import _send
    body = f"Name: {data.name}\nEmail: {data.email}\nSubject: {data.subject}\n\n{data.message}"
    _send(
        subject=f"[GTU ExamAI Contact] {data.subject}",
        to="yashbonde21@gmail.com",
        text=body,
    )
    return {"success": True}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gtu-examai-api", "version": "5.0.0"}
