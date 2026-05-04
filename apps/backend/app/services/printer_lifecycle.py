from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    Location,
    Printer,
    PrinterArchiveHistory,
    PrinterLocationHistory,
    PrinterRepair,
)
from app.models.enums import PrinterArchiveReason, PrinterRepairStatus, PrinterStatus
from app.schemas.printer_lifecycle import (
    PrinterArchiveCreate,
    PrinterMoveCreate,
    PrinterRepairCreate,
    PrinterRepairUpdate,
)


def _now() -> datetime:
    return datetime.now(UTC)


def _get_or_404(db: Session, model: type, item_id: int):
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


def _ensure_printer_can_change(printer: Printer) -> None:
    if printer.is_archived or printer.status in {
        PrinterStatus.archived,
        PrinterStatus.written_off,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Printer is archived or written off",
        )


def _commit_and_refresh(db: Session, item):
    db.commit()
    db.refresh(item)
    return item


def move_printer(
    db: Session,
    printer_id: int,
    payload: PrinterMoveCreate,
) -> PrinterLocationHistory:
    printer = _get_or_404(db, Printer, printer_id)
    _ensure_printer_can_change(printer)
    _get_or_404(db, Location, payload.to_location_id)

    moved_at = _now()
    history = PrinterLocationHistory(
        printer_id=printer.id,
        from_location_id=printer.current_location_id,
        to_location_id=payload.to_location_id,
        moved_at=moved_at,
        reason=payload.reason,
        notes=payload.notes,
    )
    printer.current_location_id = payload.to_location_id
    db.add(history)
    return _commit_and_refresh(db, history)


def send_printer_to_repair(
    db: Session,
    printer_id: int,
    payload: PrinterRepairCreate,
) -> PrinterRepair:
    printer = _get_or_404(db, Printer, printer_id)
    _ensure_printer_can_change(printer)

    repair = PrinterRepair(
        printer_id=printer.id,
        repair_status=PrinterRepairStatus.sent,
        sent_at=_now(),
        service_company=payload.service_company,
        reason=payload.reason,
        notes=payload.notes,
    )
    printer.status = PrinterStatus.in_repair
    db.add(repair)
    return _commit_and_refresh(db, repair)


def update_printer_repair(
    db: Session,
    repair_id: int,
    payload: PrinterRepairUpdate,
) -> PrinterRepair:
    repair = _get_or_404(db, PrinterRepair, repair_id)
    printer = _get_or_404(db, Printer, repair.printer_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(repair, field, value)

    if repair.repair_status == PrinterRepairStatus.returned:
        if repair.returned_at is None:
            repair.returned_at = _now()
        printer.status = PrinterStatus.in_work
    elif repair.repair_status == PrinterRepairStatus.cancelled:
        printer.status = PrinterStatus.in_work
    else:
        printer.status = PrinterStatus.in_repair

    return _commit_and_refresh(db, repair)


def archive_printer(
    db: Session,
    printer_id: int,
    payload: PrinterArchiveCreate,
) -> PrinterArchiveHistory:
    printer = _get_or_404(db, Printer, printer_id)
    archived_at = _now()

    printer.is_archived = True
    printer.status = (
        PrinterStatus.written_off
        if payload.archive_reason == PrinterArchiveReason.written_off
        else PrinterStatus.archived
    )
    if printer.decommissioned_at is None:
        printer.decommissioned_at = archived_at

    history = PrinterArchiveHistory(
        printer_id=printer.id,
        archive_reason=payload.archive_reason,
        archived_at=archived_at,
        comment=payload.comment,
    )
    db.add(history)
    return _commit_and_refresh(db, history)

