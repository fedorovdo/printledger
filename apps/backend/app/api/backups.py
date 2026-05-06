from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse

from app.schemas.backups import BackupDeleteResult, BackupFileRead, BackupRestoreRequest, BackupRestoreResult
from app.services.backups import (
    create_database_backup,
    delete_backup_file,
    get_backup_path,
    list_backup_files,
    restore_backup,
)

router = APIRouter(prefix="/api/backups", tags=["backups"])


def require_admin(request: Request) -> None:
    user = getattr(request.state, "user", None)
    if not isinstance(user, dict) or user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")


@router.get("", response_model=list[BackupFileRead])
def get_backups(_: None = Depends(require_admin)) -> list[BackupFileRead]:
    return list_backup_files()


@router.post("/create", response_model=BackupFileRead)
def post_create_backup(_: None = Depends(require_admin)) -> BackupFileRead:
    return create_database_backup()


@router.get("/{filename}/download")
def download_backup(filename: str, _: None = Depends(require_admin)) -> FileResponse:
    backup_path = get_backup_path(filename)
    return FileResponse(
        backup_path,
        filename=backup_path.name,
        media_type="application/octet-stream",
    )


@router.post("/{filename}/restore", response_model=BackupRestoreResult)
def post_restore_backup(
    filename: str,
    payload: BackupRestoreRequest,
    _: None = Depends(require_admin),
) -> BackupRestoreResult:
    if payload.confirmation != "RESTORE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation must be RESTORE",
        )
    return restore_backup(filename)


@router.delete("/{filename}", response_model=BackupDeleteResult)
def delete_backup(filename: str, _: None = Depends(require_admin)) -> BackupDeleteResult:
    return delete_backup_file(filename)
