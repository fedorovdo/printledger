import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import settings


class TokenError(Exception):
    pass


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(f"{data}{padding}".encode("ascii"))


def _sign(payload: str) -> str:
    digest = hmac.new(
        settings.app_secret_key.encode("utf-8"),
        payload.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return _b64encode(digest)


def verify_admin_credentials(username: str, password: str) -> bool:
    return secrets.compare_digest(username, settings.admin_username) and secrets.compare_digest(
        password,
        settings.admin_password,
    )


def create_access_token(username: str, role: str = "admin") -> str:
    expires_at = datetime.now(UTC) + timedelta(hours=settings.access_token_expire_hours)
    payload = {
        "username": username,
        "role": role,
        "exp": int(expires_at.timestamp()),
    }
    encoded_payload = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    return f"{encoded_payload}.{_sign(encoded_payload)}"


def verify_access_token(token: str) -> dict[str, Any]:
    try:
        encoded_payload, signature = token.split(".", 1)
    except ValueError as exc:
        raise TokenError("Invalid token") from exc

    expected_signature = _sign(encoded_payload)
    if not secrets.compare_digest(signature, expected_signature):
        raise TokenError("Invalid token signature")

    try:
        payload = json.loads(_b64decode(encoded_payload))
    except (ValueError, json.JSONDecodeError) as exc:
        raise TokenError("Invalid token payload") from exc

    expires_at = payload.get("exp")
    if not isinstance(expires_at, int) or expires_at < int(datetime.now(UTC).timestamp()):
        raise TokenError("Token expired")

    username = payload.get("username")
    role = payload.get("role")
    if not isinstance(username, str) or not isinstance(role, str):
        raise TokenError("Invalid token subject")

    return payload
