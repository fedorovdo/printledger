from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    CartridgeColorRole,
    CartridgeCondition,
    CartridgeTransactionType,
    InstalledCartridgeStatus,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class CartridgeInventoryTransactionCreate(BaseModel):
    cartridge_model_id: int
    transaction_type: CartridgeTransactionType
    quantity: int = Field(gt=0)
    item_condition: CartridgeCondition | None = None
    printer_id: int | None = None
    location_id: int | None = None
    slot_name: str | None = Field(default=None, max_length=100)
    color_role: CartridgeColorRole | None = None
    reason: str | None = Field(default=None, max_length=255)
    comment: str | None = None
    related_transaction_id: int | None = None
    created_by_user_id: int | None = None


class CartridgeInventoryTransactionRead(CartridgeInventoryTransactionCreate, ORMModel):
    id: int
    created_at: datetime


class StockInRequest(BaseModel):
    cartridge_model_id: int
    quantity: int = Field(gt=0)
    item_condition: CartridgeCondition
    reason: str | None = Field(default=None, max_length=255)
    comment: str | None = None


class CorrectionRequest(BaseModel):
    cartridge_model_id: int
    quantity: int = Field(gt=0)
    direction: str = Field(pattern="^(plus|minus)$")
    item_condition: CartridgeCondition | None = None
    reason: str = Field(min_length=1, max_length=255)
    comment: str | None = None


class InstallCartridgeRequest(BaseModel):
    cartridge_model_id: int
    printer_id: int
    quantity: int = Field(default=1, gt=0)
    item_condition: CartridgeCondition
    slot_name: str | None = Field(default=None, max_length=100)
    color_role: CartridgeColorRole | None = None
    comment: str | None = None


class RemoveCartridgeRequest(BaseModel):
    installed_cartridge_id: int
    removal_reason: str = Field(min_length=1, max_length=255)
    send_to_refill: bool = False
    write_off: bool = False
    comment: str | None = None


class RefillReturnRequest(BaseModel):
    cartridge_model_id: int
    quantity: int = Field(gt=0)
    reason: str | None = Field(default=None, max_length=255)
    comment: str | None = None


class PrinterInstalledCartridgeRead(ORMModel):
    id: int
    printer_id: int
    cartridge_model_id: int
    slot_name: str | None
    color_role: CartridgeColorRole | None
    item_condition: CartridgeCondition
    installed_at: datetime
    installed_by_user_id: int | None
    status: InstalledCartridgeStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime


class PrinterCartridgeHistoryRead(ORMModel):
    id: int
    printer_id: int
    cartridge_model_id: int
    slot_name: str | None
    color_role: CartridgeColorRole | None
    item_condition: CartridgeCondition
    installed_at: datetime
    removed_at: datetime | None
    installed_by_user_id: int | None
    removed_by_user_id: int | None
    removal_reason: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class CartridgeStockSummaryRead(BaseModel):
    cartridge_model_id: int
    model_name: str
    purchase_sku: str | None
    stock_new: int
    stock_refilled: int
    installed_total: int
    total: int
    min_stock_level: int

