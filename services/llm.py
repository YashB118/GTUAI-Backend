"""
Unified LLM helper.

Priority:
  1. Groq (Llama 3.3-70b) — 14,400 free req/day, used for ALL text generation
  2. Gemini — fallback if GROQ_API_KEY not set; also the ONLY option for PDF vision

Usage:
  from services.llm import generate_text, is_groq_available
  answer = generate_text(prompt)
"""

import json
import logging
from config import settings

logger = logging.getLogger(__name__)


def is_groq_available() -> bool:
    return bool(settings.groq_api_key)


def generate_text(prompt: str, temperature: float = 0.4, max_tokens: int = 2048) -> str:
    """
    Generate text using Groq (preferred) or Gemini (fallback).
    Returns the response string.
    Raises RuntimeError if neither is configured.
    """
    if is_groq_available():
        return _groq_generate(prompt, temperature, max_tokens)
    elif settings.gemini_api_key:
        logger.warning("Groq not configured — falling back to Gemini for text generation")
        return _gemini_generate(prompt)
    else:
        raise RuntimeError("No LLM configured. Set GROQ_API_KEY in .env")


def generate_json(prompt: str) -> list | dict:
    """
    Generate and parse a JSON response.
    Strips markdown fences automatically.
    Raises ValueError if JSON parsing fails.
    """
    raw = generate_text(prompt, temperature=0.2)
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        inner = lines[1:]
        if inner and inner[-1].strip() == "```":
            inner = inner[:-1]
        text = "\n".join(inner)
    return json.loads(text)


def _groq_generate(prompt: str, temperature: float, max_tokens: int) -> str:
    from groq import Groq
    client = Groq(api_key=settings.groq_api_key)
    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content


def _gemini_generate(prompt: str) -> str:
    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(settings.gemini_model)
    response = model.generate_content(prompt)
    try:
        return response.text.strip()
    except ValueError:
        candidates = getattr(response, "candidates", [])
        if candidates and candidates[0].content.parts:
            return candidates[0].content.parts[0].text.strip()
        return ""
