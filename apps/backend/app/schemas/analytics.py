from pydantic import BaseModel


class CartridgeUsageRow(BaseModel):
    cartridge_model_id: int
    model_name: str
    purchase_sku: str | None
    min_stock_level: int
    current_stock_new: int
    current_stock_refilled: int
    current_stock_total: int
    usage_in_period: int
    avg_monthly_usage: float
    months_of_stock_left: float | None
    recommended_purchase_1m: int
    recommended_purchase_3m: int


class CartridgeUsageMonthlyBreakdown(BaseModel):
    month: str
    usage: int


class CartridgeUsageAnalyticsRead(BaseModel):
    period_days: int
    total_usage: int
    total_current_stock: int
    rows: list[CartridgeUsageRow]
    monthly_breakdown: list[CartridgeUsageMonthlyBreakdown] | None = None
