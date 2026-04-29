from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    jwt_secret: str  # Required — get from Supabase: Settings → API → JWT Secret
    backend_url: str = "http://localhost:8000"
    allowed_origins: list[str] = ["http://localhost:3000"]
    admin_emails: list[str] = [
        "yash.b@empiricinfotech.com",
        "yashbonde21@gmail.com",
    ]

    # Phase 2 — AI Core
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    qdrant_url: str = ""
    qdrant_api_key: str = ""

    # Groq — free LLM for text generation (answers, chat)
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Phase 4 — Email notifications (optional, Resend free tier: 100/day)
    resend_api_key: str = ""
    resend_from_email: str = "noreply@gtuexamai.com"

    # Phase 5 — Monitoring (optional)
    sentry_dsn: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
