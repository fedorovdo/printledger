from datetime import datetime

from pydantic import BaseModel


class BackupFileRead(BaseModel):
    filename: str
    size_bytes: int
    modified_at: datetime
    download_url: str
