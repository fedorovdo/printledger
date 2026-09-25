from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.auth import require_admin
from app.db.session import get_db
from app.schemas.auth import CurrentUserRead
from app.schemas.cartridge_catalog import (
    CartridgeCatalogImportApplyResponse,
    CartridgeCatalogImportPreviewResponse,
)
from app.services.cartridge_catalog_excel import (
    CatalogApplyValidationError,
    CatalogExcelError,
    CatalogSnapshotConflict,
    apply_cartridge_catalog_import,
    preview_cartridge_catalog_import,
)
from app.services.cartridge_inventory_excel import MAX_IMPORT_FILE_SIZE


router = APIRouter(prefix="/api")


async def _read_xlsx(file: UploadFile) -> bytes:
    filename = file.filename or ""
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Разрешены только файлы .xlsx.",
        )
    content = await file.read(MAX_IMPORT_FILE_SIZE + 1)
    await file.close()
    if len(content) > MAX_IMPORT_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Размер XLSX-файла не должен превышать 5 MB.",
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="XLSX-файл пуст.",
        )
    return content


@router.post(
    "/cartridge-catalog/import/preview",
    response_model=CartridgeCatalogImportPreviewResponse,
    tags=["cartridge-catalog"],
)
async def preview_catalog_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: CurrentUserRead = Depends(require_admin),
) -> CartridgeCatalogImportPreviewResponse:
    content = await _read_xlsx(file)
    try:
        return preview_cartridge_catalog_import(db, content)
    except CatalogExcelError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post(
    "/cartridge-catalog/import/apply",
    response_model=CartridgeCatalogImportApplyResponse,
    tags=["cartridge-catalog"],
)
async def apply_catalog_import(
    file: UploadFile = File(...),
    snapshot_hash: str = Form(...),
    db: Session = Depends(get_db),
    _: CurrentUserRead = Depends(require_admin),
) -> CartridgeCatalogImportApplyResponse:
    content = await _read_xlsx(file)
    try:
        return apply_cartridge_catalog_import(db, content, snapshot_hash)
    except CatalogApplyValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except CatalogSnapshotConflict as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except CatalogExcelError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
