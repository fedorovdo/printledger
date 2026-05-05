from fastapi import APIRouter
from fastapi.responses import FileResponse

from app.schemas.backups import BackupFileRead
from app.services.backups import create_database_backup, get_backup_path, list_backup_files

router = APIRouter(prefix="/api/backups", tags=["backups"])


@router.get("", response_model=list[BackupFileRead])
def get_backups() -> list[BackupFileRead]:
    return list_backup_files()


@router.post("/create", response_model=BackupFileRead)
def post_create_backup() -> BackupFileRead:
    return create_database_backup()


@router.get("/{filename}/download")
def download_backup(filename: str) -> FileResponse:
    backup_path = get_backup_path(filename)
    return FileResponse(
        backup_path,
        filename=backup_path.name,
        media_type="application/octet-stream",
    )
