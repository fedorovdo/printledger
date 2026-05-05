import os
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.schemas.backups import BackupFileRead

ALLOWED_BACKUP_SUFFIXES = (".dump", ".backup", ".sql.gz")


def get_backup_dir() -> Path:
    backup_dir = Path(settings.backup_dir)
    if not backup_dir.is_absolute():
        backup_dir = Path.cwd() / backup_dir
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def is_allowed_backup_filename(filename: str) -> bool:
    return (
        filename == Path(filename).name
        and not filename.startswith(".")
        and filename.endswith(ALLOWED_BACKUP_SUFFIXES)
    )


def backup_file_to_schema(path: Path) -> BackupFileRead:
    stat = path.stat()
    return BackupFileRead(
        filename=path.name,
        size_bytes=stat.st_size,
        modified_at=datetime.fromtimestamp(stat.st_mtime, tz=UTC),
        download_url=f"/api/backups/{path.name}/download",
    )


def list_backup_files() -> list[BackupFileRead]:
    backup_dir = get_backup_dir()
    files = [
        backup_file_to_schema(path)
        for path in backup_dir.iterdir()
        if path.is_file() and is_allowed_backup_filename(path.name)
    ]
    return sorted(files, key=lambda item: item.modified_at, reverse=True)


def get_backup_path(filename: str) -> Path:
    if not is_allowed_backup_filename(filename):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup file not found")

    backup_dir = get_backup_dir().resolve()
    backup_path = (backup_dir / filename).resolve()
    if backup_dir not in backup_path.parents or not backup_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup file not found")
    return backup_path


def create_database_backup() -> BackupFileRead:
    backup_dir = get_backup_dir()
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_path = backup_dir / f"printledger_backup_{timestamp}.dump"

    database_url = make_url(settings.database_url)
    command = [
        "pg_dump",
        "-U",
        database_url.username or "printledger",
        "-d",
        database_url.database or "printledger",
        "-Fc",
        "-f",
        str(backup_path),
    ]
    if database_url.host:
        command.extend(["-h", database_url.host])
    if database_url.port:
        command.extend(["-p", str(database_url.port)])

    env = os.environ.copy()
    if database_url.password:
        env["PGPASSWORD"] = database_url.password

    try:
        subprocess.run(command, env=env, check=True, capture_output=True, text=True)
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="pg_dump is not installed in backend container",
        ) from exc
    except subprocess.CalledProcessError as exc:
        if backup_path.exists():
            backup_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=exc.stderr.strip() or "pg_dump failed",
        ) from exc

    return backup_file_to_schema(backup_path)
