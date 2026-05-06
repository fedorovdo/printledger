from pydantic import BaseModel


class CartridgeUsageRow(BaseModel):
    cartridge_model_id: int
    model_name: str
    purchase_sku: str | None
    min_stock_level: int
    is_active: bool
    current_stock_new: int
    current_stock_refilled: int
    current_stock_total: int
    usage_in_period: int
    avg_monthly_usage: float
    months_of_stock_left: float | None
    recommended_purchase_1m: int
    recommended_purchase_3m: int
    needs_purchase_1m: bool
    needs_purchase_3m: bool


class CartridgeUsageMonthlyBreakdown(BaseModel):
    month: str
    usage: int


class CartridgeUsageAnalyticsRead(BaseModel):
    period_days: int
    total_usage: int
    total_current_stock: int
    total_recommended_purchase_1m: int
    total_recommended_purchase_3m: int
    models_needing_purchase_3m: int
    rows: list[CartridgeUsageRow]
    monthly_breakdown: list[CartridgeUsageMonthlyBreakdown] | None = None
