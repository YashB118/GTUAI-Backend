import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from config import settings
from middleware.limiter import limiter
from routers import auth, papers, materials
from routers import subjects, predictions, questions, answers, admin, chat

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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gtu-examai-api", "version": "5.0.0"}
