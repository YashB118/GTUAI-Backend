"""
Email notifications via Resend (free tier: 100 emails/day).
All sends are best-effort — log on failure, never raise to caller.
"""
import logging
import httpx
from config import settings

logger = logging.getLogger(__name__)


def is_email_enabled() -> bool:
    return bool(settings.resend_api_key)


def _send(subject: str, to: str, text: str) -> bool:
    if not is_email_enabled():
        return False
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={
                    "from": settings.resend_from_email,
                    "to": to,
                    "subject": subject,
                    "text": text,
                },
            )
            if res.status_code >= 400:
                logger.warning(f"Resend send failed [{res.status_code}]: {res.text}")
                return False
            return True
    except Exception as e:
        logger.warning(f"Email send exception: {e}")
        return False


def notify_material_approved(user_email: str, material_title: str) -> bool:
    return _send(
        subject="Your study material was approved",
        to=user_email,
        text=(
            f'Good news! Your submission "{material_title}" has been approved '
            f'and is now live on GTU ExamAI. Other students can find it in the '
            f'study materials browser.'
        ),
    )


def notify_material_rejected(user_email: str, material_title: str, reason: str = "") -> bool:
    body = f'Your submission "{material_title}" was not approved.'
    if reason:
        body += f"\n\nReason: {reason}"
    body += "\n\nYou can edit and re-upload at any time."
    return _send(
        subject="Update on your study material submission",
        to=user_email,
        text=body,
    )
