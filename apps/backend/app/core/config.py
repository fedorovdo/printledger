import json

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "PrintLedger API"
    app_version: str = Field(default="0.1.0", alias="APP_VERSION")
    environment: str = Field(default="local", validation_alias=AliasChoices("APP_ENVIRONMENT", "ENVIRONMENT"))
    database_url: str = Field(
        default="postgresql+psycopg://printledger:printledger_password@postgres:5432/printledger",
        alias="DATABASE_URL",
    )
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        validation_alias=AliasChoices("BACKEND_CORS_ORIGINS", "CORS_ORIGINS"),
    )
    app_secret_key: str = Field(default="change-me", alias="APP_SECRET_KEY")
    admin_username: str = Field(default="admin", alias="ADMIN_USERNAME")
    admin_password: str = Field(default="admin123", alias="ADMIN_PASSWORD")
    access_token_expire_hours: int = Field(default=12, alias="ACCESS_TOKEN_EXPIRE_HOURS")
    backup_dir: str = Field(default="backups", alias="BACKUP_DIR")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        stripped_value = value.strip()
        if not stripped_value:
            return []
        if stripped_value.startswith("["):
            return json.loads(stripped_value)
        return [origin.strip() for origin in stripped_value.split(",") if origin.strip()]


settings = Settings()
