import re
from collections.abc import Callable
from typing import Any, TypeVar

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import (
    Branch,
    CartridgeInventoryTransaction,
    CartridgeModel,
    Location,
    Organization,
    Printer,
    PrinterCartridgeHistory,
    PrinterInstalledCartridge,
    PrinterLocationHistory,
    PrinterModel,
    PrinterModelCompatibleCartridge,
)
from app.models.enums import PrinterStatus
from app.schemas.catalog import (
    BranchCreate,
    BranchRead,
    BranchUpdate,
    CartridgeModelCreate,
    CartridgeModelRead,
    CartridgeModelUpdate,
    LocationCreate,
    LocationRead,
    LocationUpdate,
    OrganizationCreate,
    OrganizationRead,
    OrganizationUpdate,
    PrinterCreate,
    PrinterModelCreate,
    PrinterModelRead,
    PrinterModelUpdate,
    PrinterRead,
    PrinterUpdate,
)

router = APIRouter(prefix="/api")

ModelT = TypeVar("ModelT")
CreateSchemaT = TypeVar("CreateSchemaT", bound=BaseModel)
UpdateSchemaT = TypeVar("UpdateSchemaT", bound=BaseModel)


def _get_or_404(db: Session, model: type[ModelT], item_id: int) -> ModelT:
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


def _commit_or_409(db: Session, item: ModelT) -> ModelT:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database constraint violation",
        ) from exc
    db.refresh(item)
    return item


def _delete_or_409(db: Session, item: ModelT) -> dict[str, Any]:
    item_data = {column.name: getattr(item, column.name) for column in item.__table__.columns}
    db.delete(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database constraint violation",
        ) from exc
    return item_data


def normalize_text(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip()).lower()


def _raise_duplicate(detail: str) -> None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)


def _has_duplicate(
    db: Session,
    model: type[ModelT],
    predicate: Callable[[ModelT], bool],
    exclude_id: int | None = None,
) -> bool:
    items = db.scalars(select(model)).all()
    return any(
        getattr(item, "id", None) != exclude_id and predicate(item)
        for item in items
    )


def _ensure_unique(
    db: Session,
    model: type[ModelT],
    predicate: Callable[[ModelT], bool],
    detail: str,
    exclude_id: int | None = None,
) -> None:
    if _has_duplicate(db, model, predicate, exclude_id):
        _raise_duplicate(detail)


def _merged_value(item: ModelT, updates: dict[str, Any], field: str) -> Any:
    if field in updates:
        return updates[field]
    return getattr(item, field)


def _relation_exists(db: Session, model: type[ModelT], field: Any, value: int) -> bool:
    return db.scalar(select(model.id).where(field == value).limit(1)) is not None


def _ensure_printer_model_can_be_deleted(db: Session, printer_model_id: int) -> None:
    if _relation_exists(db, Printer, Printer.printer_model_id, printer_model_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя удалить модель принтера: она используется в принтерах. Модель используется. Ее нельзя удалить, но можно деактивировать.",
        )
    if _relation_exists(
        db,
        PrinterModelCompatibleCartridge,
        PrinterModelCompatibleCartridge.printer_model_id,
        printer_model_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя удалить модель принтера: она используется в совместимостях. Модель используется. Ее нельзя удалить, но можно деактивировать.",
        )


def _ensure_cartridge_model_can_be_deleted(db: Session, cartridge_model_id: int) -> None:
    relation_checks = (
        (CartridgeInventoryTransaction, CartridgeInventoryTransaction.cartridge_model_id),
        (PrinterInstalledCartridge, PrinterInstalledCartridge.cartridge_model_id),
        (PrinterCartridgeHistory, PrinterCartridgeHistory.cartridge_model_id),
        (PrinterModelCompatibleCartridge, PrinterModelCompatibleCartridge.cartridge_model_id),
    )
    if any(_relation_exists(db, model, field, cartridge_model_id) for model, field in relation_checks):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя удалить модель картриджа: она используется в истории или остатках. Модель используется. Ее нельзя удалить, но можно деактивировать.",
        )


def _ensure_organization_can_be_deleted(db: Session, organization_id: int) -> None:
    if _relation_exists(db, Branch, Branch.organization_id, organization_id) or _relation_exists(
        db, Location, Location.organization_id, organization_id
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя удалить организацию: она используется. Запись используется. Ее нельзя удалить, но можно деактивировать.",
        )


def _ensure_branch_can_be_deleted(db: Session, branch_id: int) -> None:
    if _relation_exists(db, Location, Location.branch_id, branch_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя удалить филиал: он используется. Запись используется. Ее нельзя удалить, но можно деактивировать.",
        )


def _ensure_location_can_be_deleted(db: Session, location_id: int) -> None:
    is_used = any(
        (
            _relation_exists(db, Printer, Printer.current_location_id, location_id),
            _relation_exists(db, PrinterLocationHistory, PrinterLocationHistory.from_location_id, location_id),
            _relation_exists(db, PrinterLocationHistory, PrinterLocationHistory.to_location_id, location_id),
            _relation_exists(db, CartridgeInventoryTransaction, CartridgeInventoryTransaction.location_id, location_id),
        )
    )
    if is_used:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Нельзя удалить локацию: она используется. Запись используется. Ее нельзя удалить, но можно деактивировать.",
        )


def _validate_organization_unique(
    db: Session,
    name: str,
    short_name: str | None,
    exclude_id: int | None = None,
) -> None:
    normalized_name = normalize_text(name)
    normalized_short_name = normalize_text(short_name)
    _ensure_unique(
        db,
        Organization,
        lambda item: normalize_text(item.name) == normalized_name,
        "Организация уже существует.",
        exclude_id,
    )
    if normalized_short_name:
        _ensure_unique(
            db,
            Organization,
            lambda item: normalize_text(item.short_name) == normalized_short_name,
            "Организация с таким коротким именем уже существует.",
            exclude_id,
        )


def _validate_branch_unique(
    db: Session,
    organization_id: int,
    name: str,
    exclude_id: int | None = None,
) -> None:
    normalized_name = normalize_text(name)
    _ensure_unique(
        db,
        Branch,
        lambda item: item.organization_id == organization_id
        and normalize_text(item.name) == normalized_name,
        "Филиал с таким названием уже существует в выбранной организации.",
        exclude_id,
    )


def _validate_location_unique(
    db: Session,
    organization_id: int,
    branch_id: int | None,
    display_name: str,
    department: str | None,
    room: str | None,
    exclude_id: int | None = None,
) -> None:
    normalized_display_name = normalize_text(display_name)
    normalized_department = normalize_text(department)
    normalized_room = normalize_text(room)
    _ensure_unique(
        db,
        Location,
        lambda item: item.organization_id == organization_id
        and item.branch_id == branch_id
        and normalize_text(item.display_name) == normalized_display_name,
        "Такая локация уже существует.",
        exclude_id,
    )
    if normalized_department or normalized_room:
        _ensure_unique(
            db,
            Location,
            lambda item: item.organization_id == organization_id
            and item.branch_id == branch_id
            and normalize_text(item.department) == normalized_department
            and normalize_text(item.room) == normalized_room,
            "Такая локация уже существует.",
            exclude_id,
        )


def _validate_printer_model_unique(
    db: Session,
    _vendor: str | None,
    name: str,
    exclude_id: int | None = None,
) -> None:
    normalized_name = normalize_text(name)
    _ensure_unique(
        db,
        PrinterModel,
        lambda item: normalize_text(item.name) == normalized_name,
        "Модель принтера уже существует.",
        exclude_id,
    )


def _validate_cartridge_model_unique(
    db: Session,
    _vendor: str | None,
    model_name: str,
    purchase_sku: str | None,
    exclude_id: int | None = None,
) -> None:
    normalized_model_name = normalize_text(model_name)
    normalized_purchase_sku = normalize_text(purchase_sku)
    _ensure_unique(
        db,
        CartridgeModel,
        lambda item: normalize_text(item.model_name) == normalized_model_name,
        "Модель картриджа уже существует.",
        exclude_id,
    )
    if normalized_purchase_sku:
        _ensure_unique(
            db,
            CartridgeModel,
            lambda item: normalize_text(item.purchase_sku) == normalized_purchase_sku,
            "Картридж с таким артикулом уже существует.",
            exclude_id,
        )


def _validate_printer_unique(
    db: Session,
    inventory_number: str | None,
    serial_number: str | None,
    mac_address: str | None,
    ip_address: str | None,
    exclude_id: int | None = None,
) -> None:
    normalized_inventory_number = normalize_text(inventory_number)
    normalized_serial_number = normalize_text(serial_number)
    normalized_mac_address = normalize_text(mac_address)
    normalized_ip_address = normalize_text(ip_address)

    if normalized_inventory_number:
        _ensure_unique(
            db,
            Printer,
            lambda item: normalize_text(item.inventory_number) == normalized_inventory_number,
            "Принтер с таким инвентарным номером уже существует.",
            exclude_id,
        )
    if normalized_serial_number:
        _ensure_unique(
            db,
            Printer,
            lambda item: not item.is_archived
            and normalize_text(item.serial_number) == normalized_serial_number,
            "Принтер с таким серийным номером уже существует.",
            exclude_id,
        )
    if normalized_mac_address:
        _ensure_unique(
            db,
            Printer,
            lambda item: not item.is_archived
            and normalize_text(item.mac_address) == normalized_mac_address,
            "Принтер с таким MAC-адресом уже существует.",
            exclude_id,
        )
    if normalized_ip_address:
        _ensure_unique(
            db,
            Printer,
            lambda item: not item.is_archived
            and normalize_text(item.ip_address) == normalized_ip_address,
            "Принтер с таким IP-адресом уже существует.",
            exclude_id,
        )


def list_items(db: Session, model: type[ModelT], offset: int = 0, limit: int = 100) -> list[ModelT]:
    limit = min(limit, 500)
    return list(db.scalars(select(model).offset(offset).limit(limit)).all())


def create_item(db: Session, model: type[ModelT], payload: CreateSchemaT) -> ModelT:
    item = model(**payload.model_dump())
    db.add(item)
    return _commit_or_409(db, item)


def update_item(db: Session, item: ModelT, payload: UpdateSchemaT) -> ModelT:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    return _commit_or_409(db, item)


@router.get("/organizations", response_model=list[OrganizationRead], tags=["organizations"])
def get_organizations(
    offset: int = 0, limit: int = 100, db: Session = Depends(get_db)
) -> list[Organization]:
    return list_items(db, Organization, offset, limit)


@router.get("/organizations/{item_id}", response_model=OrganizationRead, tags=["organizations"])
def get_organization(item_id: int, db: Session = Depends(get_db)) -> Organization:
    return _get_or_404(db, Organization, item_id)


@router.post(
    "/organizations",
    response_model=OrganizationRead,
    status_code=status.HTTP_201_CREATED,
    tags=["organizations"],
)
def post_organization(payload: OrganizationCreate, db: Session = Depends(get_db)) -> Organization:
    _validate_organization_unique(db, payload.name, payload.short_name)
    return create_item(db, Organization, payload)


@router.patch("/organizations/{item_id}", response_model=OrganizationRead, tags=["organizations"])
def patch_organization(
    item_id: int, payload: OrganizationUpdate, db: Session = Depends(get_db)
) -> Organization:
    item = _get_or_404(db, Organization, item_id)
    updates = payload.model_dump(exclude_unset=True)
    _validate_organization_unique(
        db,
        _merged_value(item, updates, "name"),
        _merged_value(item, updates, "short_name"),
        item.id,
    )
    return update_item(db, item, payload)


@router.delete("/organizations/{item_id}", response_model=OrganizationRead, tags=["organizations"])
def delete_organization(item_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    item = _get_or_404(db, Organization, item_id)
    _ensure_organization_can_be_deleted(db, item.id)
    return _delete_or_409(db, item)


@router.get("/branches", response_model=list[BranchRead], tags=["branches"])
def get_branches(
    offset: int = 0, limit: int = 100, db: Session = Depends(get_db)
) -> list[Branch]:
    return list_items(db, Branch, offset, limit)


@router.get("/branches/{item_id}", response_model=BranchRead, tags=["branches"])
def get_branch(item_id: int, db: Session = Depends(get_db)) -> Branch:
    return _get_or_404(db, Branch, item_id)


@router.post(
    "/branches",
    response_model=BranchRead,
    status_code=status.HTTP_201_CREATED,
    tags=["branches"],
)
def post_branch(payload: BranchCreate, db: Session = Depends(get_db)) -> Branch:
    _validate_branch_unique(db, payload.organization_id, payload.name)
    return create_item(db, Branch, payload)


@router.patch("/branches/{item_id}", response_model=BranchRead, tags=["branches"])
def patch_branch(item_id: int, payload: BranchUpdate, db: Session = Depends(get_db)) -> Branch:
    item = _get_or_404(db, Branch, item_id)
    updates = payload.model_dump(exclude_unset=True)
    _validate_branch_unique(
        db,
        _merged_value(item, updates, "organization_id"),
        _merged_value(item, updates, "name"),
        item.id,
    )
    return update_item(db, item, payload)


@router.delete("/branches/{item_id}", response_model=BranchRead, tags=["branches"])
def delete_branch(item_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    item = _get_or_404(db, Branch, item_id)
    _ensure_branch_can_be_deleted(db, item.id)
    return _delete_or_409(db, item)


@router.get("/locations", response_model=list[LocationRead], tags=["locations"])
def get_locations(
    offset: int = 0, limit: int = 100, db: Session = Depends(get_db)
) -> list[Location]:
    return list_items(db, Location, offset, limit)


@router.get("/locations/{item_id}", response_model=LocationRead, tags=["locations"])
def get_location(item_id: int, db: Session = Depends(get_db)) -> Location:
    return _get_or_404(db, Location, item_id)


@router.post(
    "/locations",
    response_model=LocationRead,
    status_code=status.HTTP_201_CREATED,
    tags=["locations"],
)
def post_location(payload: LocationCreate, db: Session = Depends(get_db)) -> Location:
    _validate_location_unique(
        db,
        payload.organization_id,
        payload.branch_id,
        payload.display_name,
        payload.department,
        payload.room,
    )
    return create_item(db, Location, payload)


@router.patch("/locations/{item_id}", response_model=LocationRead, tags=["locations"])
def patch_location(
    item_id: int, payload: LocationUpdate, db: Session = Depends(get_db)
) -> Location:
    item = _get_or_404(db, Location, item_id)
    updates = payload.model_dump(exclude_unset=True)
    _validate_location_unique(
        db,
        _merged_value(item, updates, "organization_id"),
        _merged_value(item, updates, "branch_id"),
        _merged_value(item, updates, "display_name"),
        _merged_value(item, updates, "department"),
        _merged_value(item, updates, "room"),
        item.id,
    )
    return update_item(db, item, payload)


@router.delete("/locations/{item_id}", response_model=LocationRead, tags=["locations"])
def delete_location(item_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    item = _get_or_404(db, Location, item_id)
    _ensure_location_can_be_deleted(db, item.id)
    return _delete_or_409(db, item)


@router.get("/printer-models", response_model=list[PrinterModelRead], tags=["printer-models"])
def get_printer_models(
    offset: int = 0, limit: int = 100, db: Session = Depends(get_db)
) -> list[PrinterModel]:
    return list_items(db, PrinterModel, offset, limit)


@router.get("/printer-models/{item_id}", response_model=PrinterModelRead, tags=["printer-models"])
def get_printer_model(item_id: int, db: Session = Depends(get_db)) -> PrinterModel:
    return _get_or_404(db, PrinterModel, item_id)


@router.post(
    "/printer-models",
    response_model=PrinterModelRead,
    status_code=status.HTTP_201_CREATED,
    tags=["printer-models"],
)
def post_printer_model(
    payload: PrinterModelCreate, db: Session = Depends(get_db)
) -> PrinterModel:
    _validate_printer_model_unique(db, payload.vendor, payload.name)
    return create_item(db, PrinterModel, payload)


@router.patch("/printer-models/{item_id}", response_model=PrinterModelRead, tags=["printer-models"])
def patch_printer_model(
    item_id: int, payload: PrinterModelUpdate, db: Session = Depends(get_db)
) -> PrinterModel:
    item = _get_or_404(db, PrinterModel, item_id)
    updates = payload.model_dump(exclude_unset=True)
    _validate_printer_model_unique(
        db,
        _merged_value(item, updates, "vendor"),
        _merged_value(item, updates, "name"),
        item.id,
    )
    return update_item(db, item, payload)


@router.delete("/printer-models/{item_id}", response_model=PrinterModelRead, tags=["printer-models"])
def delete_printer_model(item_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    item = _get_or_404(db, PrinterModel, item_id)
    _ensure_printer_model_can_be_deleted(db, item.id)
    return _delete_or_409(db, item)


@router.get("/cartridge-models", response_model=list[CartridgeModelRead], tags=["cartridge-models"])
def get_cartridge_models(
    offset: int = 0, limit: int = 100, db: Session = Depends(get_db)
) -> list[CartridgeModel]:
    return list_items(db, CartridgeModel, offset, limit)


@router.get(
    "/cartridge-models/{item_id}",
    response_model=CartridgeModelRead,
    tags=["cartridge-models"],
)
def get_cartridge_model(item_id: int, db: Session = Depends(get_db)) -> CartridgeModel:
    return _get_or_404(db, CartridgeModel, item_id)


@router.post(
    "/cartridge-models",
    response_model=CartridgeModelRead,
    status_code=status.HTTP_201_CREATED,
    tags=["cartridge-models"],
)
def post_cartridge_model(
    payload: CartridgeModelCreate, db: Session = Depends(get_db)
) -> CartridgeModel:
    _validate_cartridge_model_unique(db, payload.vendor, payload.model_name, payload.purchase_sku)
    return create_item(db, CartridgeModel, payload)


@router.patch(
    "/cartridge-models/{item_id}",
    response_model=CartridgeModelRead,
    tags=["cartridge-models"],
)
def patch_cartridge_model(
    item_id: int, payload: CartridgeModelUpdate, db: Session = Depends(get_db)
) -> CartridgeModel:
    item = _get_or_404(db, CartridgeModel, item_id)
    updates = payload.model_dump(exclude_unset=True)
    _validate_cartridge_model_unique(
        db,
        _merged_value(item, updates, "vendor"),
        _merged_value(item, updates, "model_name"),
        _merged_value(item, updates, "purchase_sku"),
        item.id,
    )
    return update_item(db, item, payload)


@router.delete(
    "/cartridge-models/{item_id}",
    response_model=CartridgeModelRead,
    tags=["cartridge-models"],
)
def delete_cartridge_model(item_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    item = _get_or_404(db, CartridgeModel, item_id)
    _ensure_cartridge_model_can_be_deleted(db, item.id)
    return _delete_or_409(db, item)


@router.get("/printers", response_model=list[PrinterRead], tags=["printers"])
def get_printers(
    offset: int = 0, limit: int = 100, db: Session = Depends(get_db)
) -> list[Printer]:
    return list_items(db, Printer, offset, limit)


@router.get("/printers/{item_id}", response_model=PrinterRead, tags=["printers"])
def get_printer(item_id: int, db: Session = Depends(get_db)) -> Printer:
    return _get_or_404(db, Printer, item_id)


@router.post(
    "/printers",
    response_model=PrinterRead,
    status_code=status.HTTP_201_CREATED,
    tags=["printers"],
)
def post_printer(payload: PrinterCreate, db: Session = Depends(get_db)) -> Printer:
    _validate_printer_unique(
        db,
        payload.inventory_number,
        payload.serial_number,
        payload.mac_address,
        payload.ip_address,
    )
    return create_item(db, Printer, payload)


@router.patch("/printers/{item_id}", response_model=PrinterRead, tags=["printers"])
def patch_printer(item_id: int, payload: PrinterUpdate, db: Session = Depends(get_db)) -> Printer:
    item = _get_or_404(db, Printer, item_id)
    updates = payload.model_dump(exclude_unset=True)
    _validate_printer_unique(
        db,
        _merged_value(item, updates, "inventory_number"),
        _merged_value(item, updates, "serial_number"),
        _merged_value(item, updates, "mac_address"),
        _merged_value(item, updates, "ip_address"),
        item.id,
    )
    return update_item(db, item, payload)


@router.delete("/printers/{item_id}", response_model=PrinterRead, tags=["printers"])
def delete_printer(item_id: int, db: Session = Depends(get_db)) -> Printer:
    item = _get_or_404(db, Printer, item_id)
    item.is_archived = True
    item.status = PrinterStatus.archived
    return _commit_or_409(db, item)
