from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import (
    CartridgeInventoryTransaction,
    PrinterCartridgeHistory,
    PrinterInstalledCartridge,
)
from app.models.enums import CartridgeTransactionType, InstalledCartridgeStatus
from app.schemas.inventory import (
    CartridgeInventoryTransactionRead,
    CartridgeStockSummaryRead,
    CorrectionRequest,
    InstallCartridgeRequest,
    PrinterCartridgeHistoryRead,
    PrinterInstalledCartridgeRead,
    RefillReturnRequest,
    RemoveCartridgeRequest,
    StockInRequest,
)
from app.services.cartridge_inventory import (
    create_correction_transaction,
    create_refill_return_transaction,
    create_stock_in_transaction,
    get_stock_summary,
    install_cartridge,
    remove_cartridge,
)

router = APIRouter(prefix="/api")


@router.post(
    "/cartridge-transactions/stock-in",
    response_model=CartridgeInventoryTransactionRead,
    tags=["cartridge-transactions"],
)
def post_stock_in(
    payload: StockInRequest,
    db: Session = Depends(get_db),
) -> CartridgeInventoryTransaction:
    return create_stock_in_transaction(db, payload)


@router.post(
    "/cartridge-transactions/correction",
    response_model=CartridgeInventoryTransactionRead,
    tags=["cartridge-transactions"],
)
def post_correction(
    payload: CorrectionRequest,
    db: Session = Depends(get_db),
) -> CartridgeInventoryTransaction:
    return create_correction_transaction(db, payload)


@router.post(
    "/cartridge-transactions/install",
    response_model=CartridgeInventoryTransactionRead,
    tags=["cartridge-transactions"],
)
def post_install(
    payload: InstallCartridgeRequest,
    db: Session = Depends(get_db),
) -> CartridgeInventoryTransaction:
    return install_cartridge(db, payload)


@router.post(
    "/cartridge-transactions/remove",
    response_model=PrinterInstalledCartridgeRead,
    tags=["cartridge-transactions"],
)
def post_remove(
    payload: RemoveCartridgeRequest,
    db: Session = Depends(get_db),
) -> PrinterInstalledCartridge:
    return remove_cartridge(db, payload)


@router.post(
    "/cartridge-transactions/refill-return",
    response_model=CartridgeInventoryTransactionRead,
    tags=["cartridge-transactions"],
)
def post_refill_return(
    payload: RefillReturnRequest,
    db: Session = Depends(get_db),
) -> CartridgeInventoryTransaction:
    return create_refill_return_transaction(db, payload)


@router.get(
    "/cartridge-transactions",
    response_model=list[CartridgeInventoryTransactionRead],
    tags=["cartridge-transactions"],
)
def get_cartridge_transactions(
    cartridge_model_id: int | None = None,
    printer_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    transaction_type: CartridgeTransactionType | None = None,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[CartridgeInventoryTransaction]:
    query = select(CartridgeInventoryTransaction)
    if cartridge_model_id is not None:
        query = query.where(CartridgeInventoryTransaction.cartridge_model_id == cartridge_model_id)
    if printer_id is not None:
        query = query.where(CartridgeInventoryTransaction.printer_id == printer_id)
    if date_from is not None:
        query = query.where(CartridgeInventoryTransaction.created_at >= date_from)
    if date_to is not None:
        query = query.where(CartridgeInventoryTransaction.created_at <= date_to)
    if transaction_type is not None:
        query = query.where(CartridgeInventoryTransaction.transaction_type == transaction_type)

    limit = min(limit, 500)
    query = query.order_by(CartridgeInventoryTransaction.created_at.desc()).offset(offset).limit(limit)
    return list(db.scalars(query).all())


@router.get(
    "/cartridge-stock",
    response_model=list[CartridgeStockSummaryRead],
    tags=["cartridge-stock"],
)
def get_cartridge_stock(db: Session = Depends(get_db)) -> list[CartridgeStockSummaryRead]:
    return get_stock_summary(db)


@router.get(
    "/printers/{printer_id}/installed-cartridges",
    response_model=list[PrinterInstalledCartridgeRead],
    tags=["printers"],
)
def get_printer_installed_cartridges(
    printer_id: int,
    db: Session = Depends(get_db),
) -> list[PrinterInstalledCartridge]:
    query = (
        select(PrinterInstalledCartridge)
        .where(
            PrinterInstalledCartridge.printer_id == printer_id,
            PrinterInstalledCartridge.status == InstalledCartridgeStatus.installed,
        )
        .order_by(PrinterInstalledCartridge.installed_at.desc())
    )
    return list(db.scalars(query).all())


@router.get(
    "/cartridge-models/{cartridge_model_id}/history",
    response_model=list[CartridgeInventoryTransactionRead],
    tags=["cartridge-models"],
)
def get_cartridge_model_history(
    cartridge_model_id: int,
    db: Session = Depends(get_db),
) -> list[CartridgeInventoryTransaction]:
    query = (
        select(CartridgeInventoryTransaction)
        .where(CartridgeInventoryTransaction.cartridge_model_id == cartridge_model_id)
        .order_by(CartridgeInventoryTransaction.created_at.desc())
    )
    return list(db.scalars(query).all())


@router.get(
    "/printers/{printer_id}/cartridge-history",
    response_model=list[PrinterCartridgeHistoryRead],
    tags=["printers"],
)
def get_printer_cartridge_history(
    printer_id: int,
    db: Session = Depends(get_db),
) -> list[PrinterCartridgeHistory]:
    query = (
        select(PrinterCartridgeHistory)
        .where(PrinterCartridgeHistory.printer_id == printer_id)
        .order_by(PrinterCartridgeHistory.installed_at.desc())
    )
    return list(db.scalars(query).all())

