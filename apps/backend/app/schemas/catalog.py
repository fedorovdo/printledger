from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import CartridgeType, ColorMode, PrinterStatus, PrintTechnology


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class OrganizationBase(BaseModel):
    name: str = Field(max_length=255)
    short_name: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    is_active: bool = True


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    short_name: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    is_active: bool | None = None


class OrganizationRead(OrganizationBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class BranchBase(BaseModel):
    organization_id: int
    name: str = Field(max_length=255)
    address: str | None = None
    notes: str | None = None
    is_active: bool = True


class BranchCreate(BranchBase):
    pass


class BranchUpdate(BaseModel):
    organization_id: int | None = None
    name: str | None = Field(default=None, max_length=255)
    address: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class BranchRead(BranchBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class LocationBase(BaseModel):
    organization_id: int
    branch_id: int | None = None
    department: str | None = Field(default=None, max_length=255)
    room: str | None = Field(default=None, max_length=100)
    display_name: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    is_active: bool = True


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    organization_id: int | None = None
    branch_id: int | None = None
    department: str | None = Field(default=None, max_length=255)
    room: str | None = Field(default=None, max_length=100)
    display_name: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    is_active: bool | None = None


class LocationRead(LocationBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class PrinterModelBase(BaseModel):
    vendor: str | None = Field(default=None, max_length=100)
    name: str = Field(max_length=255)
    print_technology: PrintTechnology
    color_mode: ColorMode
    cartridge_slots_count: int = Field(default=1, ge=1)
    notes: str | None = None
    is_active: bool = True


class PrinterModelCreate(PrinterModelBase):
    pass


class PrinterModelUpdate(BaseModel):
    vendor: str | None = Field(default=None, max_length=100)
    name: str | None = Field(default=None, max_length=255)
    print_technology: PrintTechnology | None = None
    color_mode: ColorMode | None = None
    cartridge_slots_count: int | None = Field(default=None, ge=1)
    notes: str | None = None
    is_active: bool | None = None


class PrinterModelRead(PrinterModelBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class CartridgeModelBase(BaseModel):
    vendor: str | None = Field(default=None, max_length=100)
    model_name: str = Field(max_length=255)
    purchase_sku: str | None = Field(default=None, max_length=100)
    cartridge_type: CartridgeType
    min_stock_level: int = Field(default=0, ge=0)
    notes: str | None = None
    is_active: bool = True


class CartridgeModelCreate(CartridgeModelBase):
    pass


class CartridgeModelUpdate(BaseModel):
    vendor: str | None = Field(default=None, max_length=100)
    model_name: str | None = Field(default=None, max_length=255)
    purchase_sku: str | None = Field(default=None, max_length=100)
    cartridge_type: CartridgeType | None = None
    min_stock_level: int | None = Field(default=None, ge=0)
    notes: str | None = None
    is_active: bool | None = None


class CartridgeModelRead(CartridgeModelBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime


class PrinterBase(BaseModel):
    printer_model_id: int
    serial_number: str | None = Field(default=None, max_length=100)
    inventory_number: str | None = Field(default=None, max_length=100)
    ip_address: str | None = None
    mac_address: str | None = Field(default=None, max_length=17)
    web_login: str | None = Field(default=None, max_length=100)
    web_password: str | None = Field(default=None, max_length=255)
    current_location_id: int | None = None
    status: PrinterStatus = PrinterStatus.in_work
    notes: str | None = None
    commissioned_at: datetime | None = None
    decommissioned_at: datetime | None = None
    is_archived: bool = False

    @field_validator("ip_address", mode="before")
    @classmethod
    def normalize_ip_address(cls, value: object) -> str | None:
        if value is None or value == "":
            return None
        return str(value)


class PrinterCreate(PrinterBase):
    pass


class PrinterUpdate(BaseModel):
    printer_model_id: int | None = None
    serial_number: str | None = Field(default=None, max_length=100)
    inventory_number: str | None = Field(default=None, max_length=100)
    ip_address: str | None = None
    mac_address: str | None = Field(default=None, max_length=17)
    web_login: str | None = Field(default=None, max_length=100)
    web_password: str | None = Field(default=None, max_length=255)
    current_location_id: int | None = None
    status: PrinterStatus | None = None
    notes: str | None = None
    commissioned_at: datetime | None = None
    decommissioned_at: datetime | None = None
    is_archived: bool | None = None


class PrinterRead(PrinterBase, ORMModel):
    id: int
    created_at: datetime
    updated_at: datetime
