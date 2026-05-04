from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    CartridgeInventoryTransaction,
    CartridgeModel,
    Printer,
    PrinterCartridgeHistory,
    PrinterInstalledCartridge,
)
from app.models.enums import (
    CartridgeCondition,
    CartridgeTransactionType,
    InstalledCartridgeStatus,
)
from app.schemas.inventory import (
    CartridgeStockSummaryRead,
    CorrectionRequest,
    InstallCartridgeRequest,
    RefillReturnRequest,
    RemoveCartridgeRequest,
    StockInRequest,
)


def _now() -> datetime:
    return datetime.now(UTC)


def _get_or_404(db: Session, model: type, item_id: int):
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


def _commit_and_refresh(db: Session, item):
    db.commit()
    db.refresh(item)
    return item


def _transaction_stock_delta(
    transaction: CartridgeInventoryTransaction,
    condition: CartridgeCondition,
) -> int:
    if transaction.item_condition != condition:
        return 0

    if transaction.transaction_type in {
        CartridgeTransactionType.correction_plus,
        CartridgeTransactionType.stock_in_new,
        CartridgeTransactionType.stock_in_refilled,
        CartridgeTransactionType.receive_from_refill,
    }:
        return transaction.quantity

    if transaction.transaction_type in {
        CartridgeTransactionType.correction_minus,
        CartridgeTransactionType.install,
    }:
        return -transaction.quantity

    if (
        transaction.transaction_type == CartridgeTransactionType.write_off
        and transaction.printer_id is None
    ):
        return -transaction.quantity

    return 0


def get_stock_for_condition(
    db: Session,
    cartridge_model_id: int,
    condition: CartridgeCondition,
) -> int:
    transactions = db.scalars(
        select(CartridgeInventoryTransaction).where(
            CartridgeInventoryTransaction.cartridge_model_id == cartridge_model_id
        )
    ).all()
    return sum(_transaction_stock_delta(transaction, condition) for transaction in transactions)


def create_stock_in_transaction(
    db: Session,
    payload: StockInRequest,
) -> CartridgeInventoryTransaction:
    _get_or_404(db, CartridgeModel, payload.cartridge_model_id)
    transaction_type = (
        CartridgeTransactionType.stock_in_new
        if payload.item_condition == CartridgeCondition.new
        else CartridgeTransactionType.stock_in_refilled
    )
    transaction = CartridgeInventoryTransaction(
        cartridge_model_id=payload.cartridge_model_id,
        transaction_type=transaction_type,
        quantity=payload.quantity,
        item_condition=payload.item_condition,
        reason=payload.reason,
        comment=payload.comment,
    )
    db.add(transaction)
    return _commit_and_refresh(db, transaction)


def create_correction_transaction(
    db: Session,
    payload: CorrectionRequest,
) -> CartridgeInventoryTransaction:
    _get_or_404(db, CartridgeModel, payload.cartridge_model_id)
    if payload.item_condition is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="item_condition is required for stock correction",
        )

    transaction_type = (
        CartridgeTransactionType.correction_plus
        if payload.direction == "plus"
        else CartridgeTransactionType.correction_minus
    )

    if transaction_type == CartridgeTransactionType.correction_minus:
        available = get_stock_for_condition(
            db, payload.cartridge_model_id, payload.item_condition
        )
        if available < payload.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Not enough stock for correction",
            )

    transaction = CartridgeInventoryTransaction(
        cartridge_model_id=payload.cartridge_model_id,
        transaction_type=transaction_type,
        quantity=payload.quantity,
        item_condition=payload.item_condition,
        reason=payload.reason,
        comment=payload.comment,
    )
    db.add(transaction)
    return _commit_and_refresh(db, transaction)


def install_cartridge(
    db: Session,
    payload: InstallCartridgeRequest,
) -> CartridgeInventoryTransaction:
    if payload.quantity != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MVP supports installing exactly one cartridge at a time",
        )

    _get_or_404(db, CartridgeModel, payload.cartridge_model_id)
    printer = _get_or_404(db, Printer, payload.printer_id)

    available = get_stock_for_condition(
        db, payload.cartridge_model_id, payload.item_condition
    )
    if available < payload.quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Not enough stock to install cartridge",
        )

    conflict_query = select(PrinterInstalledCartridge).where(
        PrinterInstalledCartridge.printer_id == payload.printer_id,
        PrinterInstalledCartridge.status == InstalledCartridgeStatus.installed,
    )
    if payload.slot_name is None:
        conflict_query = conflict_query.where(PrinterInstalledCartridge.slot_name.is_(None))
    else:
        conflict_query = conflict_query.where(PrinterInstalledCartridge.slot_name == payload.slot_name)
    if payload.color_role is None:
        conflict_query = conflict_query.where(PrinterInstalledCartridge.color_role.is_(None))
    else:
        conflict_query = conflict_query.where(
            PrinterInstalledCartridge.color_role == payload.color_role
        )

    if db.scalar(conflict_query) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Printer slot already has an installed cartridge",
        )

    installed_at = _now()
    transaction = CartridgeInventoryTransaction(
        cartridge_model_id=payload.cartridge_model_id,
        transaction_type=CartridgeTransactionType.install,
        quantity=payload.quantity,
        item_condition=payload.item_condition,
        printer_id=payload.printer_id,
        location_id=printer.current_location_id,
        slot_name=payload.slot_name,
        color_role=payload.color_role,
        comment=payload.comment,
    )
    installed = PrinterInstalledCartridge(
        printer_id=payload.printer_id,
        cartridge_model_id=payload.cartridge_model_id,
        slot_name=payload.slot_name,
        color_role=payload.color_role,
        item_condition=payload.item_condition,
        installed_at=installed_at,
        notes=payload.comment,
    )
    history = PrinterCartridgeHistory(
        printer_id=payload.printer_id,
        cartridge_model_id=payload.cartridge_model_id,
        slot_name=payload.slot_name,
        color_role=payload.color_role,
        item_condition=payload.item_condition,
        installed_at=installed_at,
        notes=payload.comment,
    )
    db.add_all([transaction, installed, history])
    return _commit_and_refresh(db, transaction)


def remove_cartridge(
    db: Session,
    payload: RemoveCartridgeRequest,
) -> PrinterInstalledCartridge:
    installed = _get_or_404(db, PrinterInstalledCartridge, payload.installed_cartridge_id)
    if installed.status != InstalledCartridgeStatus.installed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cartridge is not currently installed",
        )

    removed_at = _now()
    installed.status = InstalledCartridgeStatus.removed
    installed.notes = payload.comment or installed.notes

    history_query = select(PrinterCartridgeHistory).where(
        PrinterCartridgeHistory.printer_id == installed.printer_id,
        PrinterCartridgeHistory.cartridge_model_id == installed.cartridge_model_id,
        PrinterCartridgeHistory.item_condition == installed.item_condition,
        PrinterCartridgeHistory.removed_at.is_(None),
    )
    if installed.slot_name is None:
        history_query = history_query.where(PrinterCartridgeHistory.slot_name.is_(None))
    else:
        history_query = history_query.where(PrinterCartridgeHistory.slot_name == installed.slot_name)
    if installed.color_role is None:
        history_query = history_query.where(PrinterCartridgeHistory.color_role.is_(None))
    else:
        history_query = history_query.where(PrinterCartridgeHistory.color_role == installed.color_role)

    history = db.scalar(history_query.order_by(PrinterCartridgeHistory.installed_at.desc()))
    if history is not None:
        history.removed_at = removed_at
        history.removal_reason = payload.removal_reason
        history.notes = payload.comment or history.notes

    remove_transaction = CartridgeInventoryTransaction(
        cartridge_model_id=installed.cartridge_model_id,
        transaction_type=CartridgeTransactionType.remove,
        quantity=1,
        item_condition=installed.item_condition,
        printer_id=installed.printer_id,
        slot_name=installed.slot_name,
        color_role=installed.color_role,
        reason=payload.removal_reason,
        comment=payload.comment,
    )
    db.add(remove_transaction)
    db.flush()

    if payload.send_to_refill:
        db.add(
            CartridgeInventoryTransaction(
                cartridge_model_id=installed.cartridge_model_id,
                transaction_type=CartridgeTransactionType.send_to_refill,
                quantity=1,
                item_condition=installed.item_condition,
                printer_id=installed.printer_id,
                slot_name=installed.slot_name,
                color_role=installed.color_role,
                reason=payload.removal_reason,
                comment=payload.comment,
                related_transaction_id=remove_transaction.id,
            )
        )

    if payload.write_off:
        db.add(
            CartridgeInventoryTransaction(
                cartridge_model_id=installed.cartridge_model_id,
                transaction_type=CartridgeTransactionType.write_off,
                quantity=1,
                item_condition=installed.item_condition,
                printer_id=installed.printer_id,
                slot_name=installed.slot_name,
                color_role=installed.color_role,
                reason=payload.removal_reason,
                comment=payload.comment,
                related_transaction_id=remove_transaction.id,
            )
        )

    return _commit_and_refresh(db, installed)


def create_refill_return_transaction(
    db: Session,
    payload: RefillReturnRequest,
) -> CartridgeInventoryTransaction:
    _get_or_404(db, CartridgeModel, payload.cartridge_model_id)
    transaction = CartridgeInventoryTransaction(
        cartridge_model_id=payload.cartridge_model_id,
        transaction_type=CartridgeTransactionType.receive_from_refill,
        quantity=payload.quantity,
        item_condition=CartridgeCondition.refilled,
        reason=payload.reason,
        comment=payload.comment,
    )
    db.add(transaction)
    return _commit_and_refresh(db, transaction)


def get_stock_summary(db: Session) -> list[CartridgeStockSummaryRead]:
    cartridge_models = db.scalars(select(CartridgeModel).order_by(CartridgeModel.model_name)).all()
    transactions = db.scalars(select(CartridgeInventoryTransaction)).all()
    installed_cartridges = db.scalars(
        select(PrinterInstalledCartridge).where(
            PrinterInstalledCartridge.status == InstalledCartridgeStatus.installed
        )
    ).all()

    installed_by_model: dict[int, int] = {}
    for installed in installed_cartridges:
        installed_by_model[installed.cartridge_model_id] = (
            installed_by_model.get(installed.cartridge_model_id, 0) + 1
        )

    result: list[CartridgeStockSummaryRead] = []
    for cartridge_model in cartridge_models:
        model_transactions = [
            transaction
            for transaction in transactions
            if transaction.cartridge_model_id == cartridge_model.id
        ]
        stock_new = sum(
            _transaction_stock_delta(transaction, CartridgeCondition.new)
            for transaction in model_transactions
        )
        stock_refilled = sum(
            _transaction_stock_delta(transaction, CartridgeCondition.refilled)
            for transaction in model_transactions
        )
        installed_total = installed_by_model.get(cartridge_model.id, 0)
        result.append(
            CartridgeStockSummaryRead(
                cartridge_model_id=cartridge_model.id,
                model_name=cartridge_model.model_name,
                purchase_sku=cartridge_model.purchase_sku,
                stock_new=stock_new,
                stock_refilled=stock_refilled,
                installed_total=installed_total,
                total=stock_new + stock_refilled + installed_total,
                min_stock_level=cartridge_model.min_stock_level,
            )
        )

    return result
