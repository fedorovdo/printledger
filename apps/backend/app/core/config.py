from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "PrintLedger API"
    app_version: str = Field(default="0.1.0", alias="APP_VERSION")
    environment: str = Field(default="local", alias="APP_ENVIRONMENT")
    database_url: str = Field(
        default="postgresql+psycopg://printledger:printledger_password@postgres:5432/printledger",
        alias="DATABASE_URL",
    )
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    app_secret_key: str = Field(default="change-me", alias="APP_SECRET_KEY")
    admin_username: str = Field(default="admin", alias="ADMIN_USERNAME")
    admin_password: str = Field(default="admin123", alias="ADMIN_PASSWORD")
    access_token_expire_hours: int = Field(default=12, alias="ACCESS_TOKEN_EXPIRE_HOURS")


settings = Settings()
