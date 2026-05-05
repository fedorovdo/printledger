import os
import subprocess
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.engine import URL, make_url

from app.core.config import settings
from app.schemas.backups import BackupFileRead, BackupRestoreResult

ALLOWED_BACKUP_SUFFIXES = (".dump", ".backup", ".sql.gz")


def get_backup_dir() -> Path:
    backup_dir = Path(settings.backup_dir)
    if not backup_dir.is_absolute():
        backup_dir = Path.cwd() / backup_dir
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def validate_backup_filename(filename: str) -> bool:
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
        if path.is_file() and validate_backup_filename(path.name)
    ]
    return sorted(files, key=lambda item: item.modified_at, reverse=True)


def get_backup_path(filename: str) -> Path:
    if not validate_backup_filename(filename):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup file not found")

    backup_dir = get_backup_dir().resolve()
    backup_path = (backup_dir / filename).resolve()
    if backup_dir not in backup_path.parents or not backup_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Backup file not found")
    return backup_path


def _database_url() -> URL:
    return make_url(settings.database_url)


def _database_env(database_url: URL) -> dict[str, str]:
    env = os.environ.copy()
    if database_url.password:
        env["PGPASSWORD"] = database_url.password
    return env


def _connection_args(database_url: URL) -> list[str]:
    args: list[str] = []
    if database_url.host:
        args.extend(["-h", database_url.host])
    if database_url.port:
        args.extend(["-p", str(database_url.port)])
    return args


def _run_postgres_command(command: list[str], database_url: URL, error_message: str) -> None:
    try:
        subprocess.run(
            command,
            env=_database_env(database_url),
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{command[0]} is not installed in backend container",
        ) from exc
    except subprocess.CalledProcessError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=exc.stderr.strip() or error_message,
        ) from exc


def create_backup(prefix: str = "printledger_backup") -> BackupFileRead:
    backup_dir = get_backup_dir()
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_path = backup_dir / f"{prefix}_{timestamp}.dump"

    database_url = _database_url()
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
    command.extend(_connection_args(database_url))

    try:
        _run_postgres_command(command, database_url, "pg_dump failed")
    except HTTPException:
        if backup_path.exists():
            backup_path.unlink()
        raise

    return backup_file_to_schema(backup_path)


def create_database_backup() -> BackupFileRead:
    return create_backup()


def _sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _maintenance_db(database_name: str) -> str:
    return "template1" if database_name == "postgres" else "postgres"


def _terminate_database_connections(database_url: URL) -> None:
    target_database = database_url.database or "printledger"
    maintenance_database = _maintenance_db(target_database)
    sql = (
        "SELECT pg_terminate_backend(pid) "
        "FROM pg_stat_activity "
        f"WHERE datname = {_sql_literal(target_database)} AND pid <> pg_backend_pid();"
    )
    command = [
        "psql",
        "-U",
        database_url.username or "printledger",
        "-d",
        maintenance_database,
        "-c",
        sql,
    ]
    command.extend(_connection_args(database_url))
    _run_postgres_command(command, database_url, "Failed to terminate database connections")


def _drop_and_create_database(database_url: URL) -> None:
    target_database = database_url.database or "printledger"
    username = database_url.username or "printledger"
    connection_args = _connection_args(database_url)

    _run_postgres_command(
        ["dropdb", "-U", username, *connection_args, "--if-exists", target_database],
        database_url,
        "dropdb failed",
    )
    _run_postgres_command(
        ["createdb", "-U", username, *connection_args, target_database],
        database_url,
        "createdb failed",
    )


def _restore_custom_format(backup_path: Path, database_url: URL) -> None:
    command = [
        "pg_restore",
        "-U",
        database_url.username or "printledger",
        "-d",
        database_url.database or "printledger",
        "--clean",
        "--if-exists",
        str(backup_path),
    ]
    command.extend(_connection_args(database_url))
    _run_postgres_command(command, database_url, "pg_restore failed")


def _restore_sql_gz(backup_path: Path, database_url: URL) -> None:
    gzip_process = subprocess.Popen(
        ["gzip", "-dc", str(backup_path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    psql_command = [
        "psql",
        "-U",
        database_url.username or "printledger",
        "-d",
        database_url.database or "printledger",
    ]
    psql_command.extend(_connection_args(database_url))
    psql_process = subprocess.run(
        psql_command,
        env=_database_env(database_url),
        stdin=gzip_process.stdout,
        capture_output=True,
        text=True,
    )
    if gzip_process.stdout:
        gzip_process.stdout.close()
    gzip_stderr = gzip_process.stderr.read().decode("utf-8", errors="replace") if gzip_process.stderr else ""
    gzip_returncode = gzip_process.wait()

    if gzip_returncode != 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=gzip_stderr.strip() or "gzip failed",
        )
    if psql_process.returncode != 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=psql_process.stderr.strip() or "psql restore failed",
        )


def restore_backup(filename: str) -> BackupRestoreResult:
    backup_path = get_backup_path(filename)
    pre_restore_backup = create_backup(prefix="printledger_pre_restore")
    database_url = _database_url()

    _terminate_database_connections(database_url)
    _drop_and_create_database(database_url)
    if backup_path.name.endswith(".sql.gz"):
        _restore_sql_gz(backup_path, database_url)
    else:
        _restore_custom_format(backup_path, database_url)

    return BackupRestoreResult(
        status="restored",
        filename=backup_path.name,
        pre_restore_backup=pre_restore_backup.filename,
    )
