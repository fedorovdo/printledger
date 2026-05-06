from datetime import datetime

from pydantic import BaseModel


class BackupFileRead(BaseModel):
    filename: str
    size_bytes: int
    modified_at: datetime
    download_url: str


class BackupRestoreRequest(BaseModel):
    confirmation: str


class BackupRestoreResult(BaseModel):
    status: str
    filename: str
    pre_restore_backup: str


class BackupDeleteResult(BaseModel):
    status: str
    filename: str
