import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import settings


class TokenError(Exception):
    pass


PASSWORD_ALGORITHM = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 260_000


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


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )
    return (
        f"{PASSWORD_ALGORITHM}${PASSWORD_ITERATIONS}$"
        f"{_b64encode(salt)}${_b64encode(digest)}"
    )


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations_raw, salt_raw, digest_raw = password_hash.split("$", 3)
        iterations = int(iterations_raw)
    except (ValueError, TypeError):
        return False
    if algorithm != PASSWORD_ALGORITHM:
        return False
    salt = _b64decode(salt_raw)
    expected_digest = _b64decode(digest_raw)
    actual_digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        iterations,
    )
    return secrets.compare_digest(actual_digest, expected_digest)


def create_access_token(username: str, role: str = "admin", user_id: int | None = None) -> str:
    expires_at = datetime.now(UTC) + timedelta(hours=settings.access_token_expire_hours)
    payload = {
        "username": username,
        "role": role,
        "exp": int(expires_at.timestamp()),
    }
    if user_id is not None:
        payload["user_id"] = user_id
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
    user_id = payload.get("user_id")
    if user_id is not None and not isinstance(user_id, int):
        raise TokenError("Invalid token subject")

    return payload
