from typing import Any, TypeVar

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Branch, CartridgeModel, Location, Organization, Printer, PrinterModel
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
    return create_item(db, Organization, payload)


@router.patch("/organizations/{item_id}", response_model=OrganizationRead, tags=["organizations"])
def patch_organization(
    item_id: int, payload: OrganizationUpdate, db: Session = Depends(get_db)
) -> Organization:
    return update_item(db, _get_or_404(db, Organization, item_id), payload)


@router.delete("/organizations/{item_id}", response_model=OrganizationRead, tags=["organizations"])
def delete_organization(item_id: int, db: Session = Depends(get_db)) -> Organization:
    item = _get_or_404(db, Organization, item_id)
    item.is_active = False
    return _commit_or_409(db, item)


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
    return create_item(db, Branch, payload)


@router.patch("/branches/{item_id}", response_model=BranchRead, tags=["branches"])
def patch_branch(item_id: int, payload: BranchUpdate, db: Session = Depends(get_db)) -> Branch:
    return update_item(db, _get_or_404(db, Branch, item_id), payload)


@router.delete("/branches/{item_id}", response_model=BranchRead, tags=["branches"])
def delete_branch(item_id: int, db: Session = Depends(get_db)) -> Branch:
    item = _get_or_404(db, Branch, item_id)
    item.is_active = False
    return _commit_or_409(db, item)


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
    return create_item(db, Location, payload)


@router.patch("/locations/{item_id}", response_model=LocationRead, tags=["locations"])
def patch_location(
    item_id: int, payload: LocationUpdate, db: Session = Depends(get_db)
) -> Location:
    return update_item(db, _get_or_404(db, Location, item_id), payload)


@router.delete("/locations/{item_id}", response_model=LocationRead, tags=["locations"])
def delete_location(item_id: int, db: Session = Depends(get_db)) -> Location:
    item = _get_or_404(db, Location, item_id)
    item.is_active = False
    return _commit_or_409(db, item)


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
    return create_item(db, PrinterModel, payload)


@router.patch("/printer-models/{item_id}", response_model=PrinterModelRead, tags=["printer-models"])
def patch_printer_model(
    item_id: int, payload: PrinterModelUpdate, db: Session = Depends(get_db)
) -> PrinterModel:
    return update_item(db, _get_or_404(db, PrinterModel, item_id), payload)


@router.delete("/printer-models/{item_id}", response_model=PrinterModelRead, tags=["printer-models"])
def delete_printer_model(item_id: int, db: Session = Depends(get_db)) -> PrinterModel:
    item = _get_or_404(db, PrinterModel, item_id)
    item.is_active = False
    return _commit_or_409(db, item)


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
    return create_item(db, CartridgeModel, payload)


@router.patch(
    "/cartridge-models/{item_id}",
    response_model=CartridgeModelRead,
    tags=["cartridge-models"],
)
def patch_cartridge_model(
    item_id: int, payload: CartridgeModelUpdate, db: Session = Depends(get_db)
) -> CartridgeModel:
    return update_item(db, _get_or_404(db, CartridgeModel, item_id), payload)


@router.delete(
    "/cartridge-models/{item_id}",
    response_model=CartridgeModelRead,
    tags=["cartridge-models"],
)
def delete_cartridge_model(item_id: int, db: Session = Depends(get_db)) -> CartridgeModel:
    item = _get_or_404(db, CartridgeModel, item_id)
    item.is_active = False
    return _commit_or_409(db, item)


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
    return create_item(db, Printer, payload)


@router.patch("/printers/{item_id}", response_model=PrinterRead, tags=["printers"])
def patch_printer(item_id: int, payload: PrinterUpdate, db: Session = Depends(get_db)) -> Printer:
    return update_item(db, _get_or_404(db, Printer, item_id), payload)


@router.delete("/printers/{item_id}", response_model=PrinterRead, tags=["printers"])
def delete_printer(item_id: int, db: Session = Depends(get_db)) -> Printer:
    item = _get_or_404(db, Printer, item_id)
    item.is_archived = True
    item.status = PrinterStatus.archived
    return _commit_or_409(db, item)

