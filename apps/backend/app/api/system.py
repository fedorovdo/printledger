from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/info")
def system_info() -> dict[str, str | bool]:
    return {
        "app_name": "PrintLedger",
        "version": settings.app_version,
        "environment": settings.environment,
        "auth_enabled": True,
    }
