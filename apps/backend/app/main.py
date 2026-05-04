from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.cartridge_inventory import router as cartridge_inventory_router
from app.api.catalog import router as catalog_router
from app.api.db import router as db_router
from app.api.health import router as health_router
from app.core.config import settings


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(db_router)
app.include_router(catalog_router)
app.include_router(cartridge_inventory_router)
