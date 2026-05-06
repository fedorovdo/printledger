from collections import defaultdict
from datetime import UTC, datetime, timedelta
from math import ceil

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import CartridgeInventoryTransaction, CartridgeModel
from app.models.enums import CartridgeTransactionType
from app.schemas.analytics import (
    CartridgeUsageAnalyticsRead,
    CartridgeUsageMonthlyBreakdown,
    CartridgeUsageRow,
)
from app.services.cartridge_inventory import get_stock_summary

USAGE_TRANSACTION_TYPES = {
    CartridgeTransactionType.install,
    CartridgeTransactionType.write_off,
}


def _month_key(value: datetime) -> str:
    return f"{value.year:04d}-{value.month:02d}"


def _next_month(value: datetime) -> datetime:
    if value.month == 12:
        return value.replace(year=value.year + 1, month=1, day=1)
    return value.replace(month=value.month + 1, day=1)


def _period_month_keys(start_at: datetime, end_at: datetime) -> list[str]:
    current = start_at.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end_month = end_at.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    months: list[str] = []
    while current <= end_month:
        months.append(_month_key(current))
        current = _next_month(current)
    return months


def _build_usage_row(
    model: CartridgeModel,
    stock_new: int,
    stock_refilled: int,
    usage_in_period: int,
    period_days: int,
) -> CartridgeUsageRow:
    current_stock_total = stock_new + stock_refilled
    avg_monthly_usage = usage_in_period / (period_days / 30)
    months_left = current_stock_total / avg_monthly_usage if avg_monthly_usage > 0 else None
    return CartridgeUsageRow(
        cartridge_model_id=model.id,
        model_name=model.model_name,
        purchase_sku=model.purchase_sku,
        min_stock_level=model.min_stock_level,
        current_stock_new=stock_new,
        current_stock_refilled=stock_refilled,
        current_stock_total=current_stock_total,
        usage_in_period=usage_in_period,
        avg_monthly_usage=avg_monthly_usage,
        months_of_stock_left=months_left,
        recommended_purchase_1m=max(0, ceil(avg_monthly_usage - current_stock_total)),
        recommended_purchase_3m=max(0, ceil(avg_monthly_usage * 3 - current_stock_total)),
    )


def get_cartridge_usage_analytics(
    db: Session,
    days: int = 30,
    cartridge_model_id: int | None = None,
) -> CartridgeUsageAnalyticsRead:
    if days not in {30, 90, 365}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="days must be one of: 30, 90, 365",
        )

    if cartridge_model_id is not None and db.get(CartridgeModel, cartridge_model_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cartridge model not found")

    now = datetime.now(UTC)
    start_at = now - timedelta(days=days)

    models_query = select(CartridgeModel).order_by(CartridgeModel.model_name)
    if cartridge_model_id is not None:
        models_query = models_query.where(CartridgeModel.id == cartridge_model_id)
    models = db.scalars(models_query).all()

    stock_by_model = {
        item.cartridge_model_id: item
        for item in get_stock_summary(db)
        if cartridge_model_id is None or item.cartridge_model_id == cartridge_model_id
    }

    usage_transactions = db.scalars(
        select(CartridgeInventoryTransaction).where(
            CartridgeInventoryTransaction.transaction_type.in_(USAGE_TRANSACTION_TYPES),
            CartridgeInventoryTransaction.created_at >= start_at,
            CartridgeInventoryTransaction.created_at <= now,
        )
    ).all()
    if cartridge_model_id is not None:
        usage_transactions = [
            transaction for transaction in usage_transactions if transaction.cartridge_model_id == cartridge_model_id
        ]

    usage_by_model: dict[int, int] = defaultdict(int)
    usage_by_month: dict[str, int] = defaultdict(int)
    for transaction in usage_transactions:
        usage_by_model[transaction.cartridge_model_id] += transaction.quantity
        if cartridge_model_id is not None:
            usage_by_month[_month_key(transaction.created_at)] += transaction.quantity

    rows: list[CartridgeUsageRow] = []
    for model in models:
        stock = stock_by_model.get(model.id)
        rows.append(
            _build_usage_row(
                model=model,
                stock_new=stock.stock_new if stock else 0,
                stock_refilled=stock.stock_refilled if stock else 0,
                usage_in_period=usage_by_model.get(model.id, 0),
                period_days=days,
            )
        )

    monthly_breakdown = None
    if cartridge_model_id is not None:
        monthly_breakdown = [
            CartridgeUsageMonthlyBreakdown(month=month, usage=usage_by_month.get(month, 0))
            for month in _period_month_keys(start_at, now)
        ]

    return CartridgeUsageAnalyticsRead(
        period_days=days,
        total_usage=sum(row.usage_in_period for row in rows),
        total_current_stock=sum(row.current_stock_total for row in rows),
        rows=rows,
        monthly_breakdown=monthly_breakdown,
    )
