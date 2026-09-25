from typing import Literal

from pydantic import BaseModel, Field

from app.models.enums import CartridgeType


class CartridgeCatalogImportPreviewRow(BaseModel):
    row_number: int
    status: Literal["create", "existing", "error"]
    vendor: str | None = None
    model_name: str | None = None
    purchase_sku: str | None = None
    cartridge_type: CartridgeType | None = None
    min_stock_level: int | None = None
    notes: str | None = None
    existing_model_id: int | None = None
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class CartridgeCatalogImportPreviewSummary(BaseModel):
    total_rows: int
    existing_rows: int
    create_rows: int
    error_rows: int
    snapshot_hash: str


class CartridgeCatalogImportPreviewResponse(BaseModel):
    summary: CartridgeCatalogImportPreviewSummary
    rows: list[CartridgeCatalogImportPreviewRow]


class CartridgeCatalogImportCreatedModel(BaseModel):
    id: int
    model_name: str
    vendor: str | None = None
    purchase_sku: str | None = None
    cartridge_type: CartridgeType


class CartridgeCatalogImportApplyResponse(BaseModel):
    status: Literal["applied"] = "applied"
    snapshot_hash: str
    models_processed: int
    models_created: int
    existing_models: int
    created: list[CartridgeCatalogImportCreatedModel]
