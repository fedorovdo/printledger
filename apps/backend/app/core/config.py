from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "PrintLedger API"
    database_url: str = Field(
        default="postgresql+psycopg://printledger:printledger_password@postgres:5432/printledger",
        alias="DATABASE_URL",
    )
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]


settings = Settings()
