from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.analytics import CartridgeUsageAnalyticsRead
from app.services.analytics import get_cartridge_usage_analytics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/cartridge-usage", response_model=CartridgeUsageAnalyticsRead)
def get_cartridge_usage(
    days: int = Query(default=30),
    cartridge_model_id: int | None = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
) -> CartridgeUsageAnalyticsRead:
    return get_cartridge_usage_analytics(db, days, cartridge_model_id, include_inactive)
