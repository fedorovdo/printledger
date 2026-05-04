from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PrinterArchiveReason, PrinterRepairStatus


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PrinterMoveCreate(BaseModel):
    to_location_id: int
    reason: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class PrinterLocationHistoryRead(ORMModel):
    id: int
    printer_id: int
    from_location_id: int | None
    to_location_id: int | None
    moved_at: datetime
    reason: str | None
    notes: str | None
    created_by_user_id: int | None
    created_at: datetime


class PrinterRepairCreate(BaseModel):
    service_company: str | None = Field(default=None, max_length=255)
    reason: str | None = Field(default=None, max_length=255)
    notes: str | None = None


class PrinterRepairUpdate(BaseModel):
    repair_status: PrinterRepairStatus | None = None
    returned_at: datetime | None = None
    service_company: str | None = Field(default=None, max_length=255)
    reason: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    result: str | None = None


class PrinterRepairRead(ORMModel):
    id: int
    printer_id: int
    repair_status: PrinterRepairStatus
    sent_at: datetime | None
    returned_at: datetime | None
    service_company: str | None
    reason: str | None
    notes: str | None
    result: str | None
    created_by_user_id: int | None
    created_at: datetime
    updated_at: datetime


class PrinterArchiveCreate(BaseModel):
    archive_reason: PrinterArchiveReason
    comment: str | None = None


class PrinterArchiveHistoryRead(ORMModel):
    id: int
    printer_id: int
    archive_reason: PrinterArchiveReason
    archived_at: datetime
    comment: str | None
    created_by_user_id: int | None
    created_at: datetime

