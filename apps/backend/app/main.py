from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.analytics import router as analytics_router
from app.api.auth import router as auth_router
from app.api.backups import router as backups_router
from app.api.cartridge_inventory import router as cartridge_inventory_router
from app.api.catalog import router as catalog_router
from app.api.db import router as db_router
from app.api.health import router as health_router
from app.api.printer_lifecycle import router as printer_lifecycle_router
from app.api.system import router as system_router
from app.core.config import settings
from app.core.security import TokenError, verify_access_token


app = FastAPI(title=settings.app_name)

PUBLIC_PATHS = {
    "/health",
    "/api/db-check",
    "/api/auth/login",
    "/api/auth/logout",
}


@app.middleware("http")
async def require_api_auth(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    if path.startswith("/api/") and path not in PUBLIC_PATHS:
        authorization = request.headers.get("Authorization", "")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Not authenticated"},
            )
        try:
            request.state.user = verify_access_token(token)
        except TokenError:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid or expired token"},
            )

    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health_router)
app.include_router(db_router)
app.include_router(auth_router)
app.include_router(system_router)
app.include_router(backups_router)
app.include_router(printer_lifecycle_router)
app.include_router(catalog_router)
app.include_router(cartridge_inventory_router)
app.include_router(analytics_router)
