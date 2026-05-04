from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import (
    Printer,
    PrinterArchiveHistory,
    PrinterLocationHistory,
    PrinterRepair,
)
from app.models.enums import PrinterStatus
from app.schemas.catalog import PrinterRead
from app.schemas.printer_lifecycle import (
    PrinterArchiveCreate,
    PrinterArchiveHistoryRead,
    PrinterLocationHistoryRead,
    PrinterMoveCreate,
    PrinterRepairCreate,
    PrinterRepairRead,
    PrinterRepairUpdate,
)
from app.services.printer_lifecycle import (
    archive_printer,
    move_printer,
    send_printer_to_repair,
    update_printer_repair,
)

router = APIRouter(prefix="/api")


@router.post(
    "/printers/{printer_id}/move",
    response_model=PrinterLocationHistoryRead,
    tags=["printer-lifecycle"],
)
def post_printer_move(
    printer_id: int,
    payload: PrinterMoveCreate,
    db: Session = Depends(get_db),
) -> PrinterLocationHistory:
    return move_printer(db, printer_id, payload)


@router.get(
    "/printers/{printer_id}/location-history",
    response_model=list[PrinterLocationHistoryRead],
    tags=["printer-lifecycle"],
)
def get_printer_location_history(
    printer_id: int,
    db: Session = Depends(get_db),
) -> list[PrinterLocationHistory]:
    query = (
        select(PrinterLocationHistory)
        .where(PrinterLocationHistory.printer_id == printer_id)
        .order_by(PrinterLocationHistory.moved_at.desc())
    )
    return list(db.scalars(query).all())


@router.post(
    "/printers/{printer_id}/repairs",
    response_model=PrinterRepairRead,
    tags=["printer-lifecycle"],
)
def post_printer_repair(
    printer_id: int,
    payload: PrinterRepairCreate,
    db: Session = Depends(get_db),
) -> PrinterRepair:
    return send_printer_to_repair(db, printer_id, payload)


@router.patch(
    "/printer-repairs/{repair_id}",
    response_model=PrinterRepairRead,
    tags=["printer-lifecycle"],
)
def patch_printer_repair(
    repair_id: int,
    payload: PrinterRepairUpdate,
    db: Session = Depends(get_db),
) -> PrinterRepair:
    return update_printer_repair(db, repair_id, payload)


@router.get(
    "/printers/{printer_id}/repairs",
    response_model=list[PrinterRepairRead],
    tags=["printer-lifecycle"],
)
def get_printer_repairs(
    printer_id: int,
    db: Session = Depends(get_db),
) -> list[PrinterRepair]:
    query = (
        select(PrinterRepair)
        .where(PrinterRepair.printer_id == printer_id)
        .order_by(PrinterRepair.sent_at.desc().nullslast(), PrinterRepair.created_at.desc())
    )
    return list(db.scalars(query).all())


@router.post(
    "/printers/{printer_id}/archive",
    response_model=PrinterArchiveHistoryRead,
    tags=["printer-lifecycle"],
)
def post_printer_archive(
    printer_id: int,
    payload: PrinterArchiveCreate,
    db: Session = Depends(get_db),
) -> PrinterArchiveHistory:
    return archive_printer(db, printer_id, payload)


@router.get(
    "/printers/archived",
    response_model=list[PrinterRead],
    tags=["printer-lifecycle"],
)
def get_archived_printers(db: Session = Depends(get_db)) -> list[Printer]:
    query = (
        select(Printer)
        .where(
            or_(
                Printer.is_archived.is_(True),
                Printer.status.in_([PrinterStatus.archived, PrinterStatus.written_off]),
            )
        )
        .order_by(Printer.updated_at.desc())
    )
    return list(db.scalars(query).all())


@router.get(
    "/printers/{printer_id}/archive-history",
    response_model=list[PrinterArchiveHistoryRead],
    tags=["printer-lifecycle"],
)
def get_printer_archive_history(
    printer_id: int,
    db: Session = Depends(get_db),
) -> list[PrinterArchiveHistory]:
    query = (
        select(PrinterArchiveHistory)
        .where(PrinterArchiveHistory.printer_id == printer_id)
        .order_by(PrinterArchiveHistory.archived_at.desc())
    )
    return list(db.scalars(query).all())

