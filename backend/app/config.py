from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Kuska API"
    app_version: str = "0.1.0"
    app_env: str = "development"
    app_debug: bool = False
    app_cors_origins: str = "http://localhost:3000,http://localhost:8081"
    app_allowed_hosts: str = "127.0.0.1,localhost,testserver"
    app_rate_limit_per_minute: int = Field(default=120, ge=0, le=10_000)
    gemini_api_key: str | None = Field(default=None, repr=False)
    google_api_key: str | None = Field(default=None, repr=False)
    incident_processor: str = "mock"
    gemini_model: str = "gemma-4-31b-it"
    gemini_review_threshold: float = Field(default=0.60, ge=0, le=1)
    supabase_url: str | None = None
    supabase_service_key: str | None = Field(default=None, repr=False)
    supabase_storage_bucket: str = "incident-evidence"

    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.app_cors_origins.split(",") if origin.strip()]

    @property
    def allowed_hosts(self) -> list[str]:
        return [host.strip() for host in self.app_allowed_hosts.split(",") if host.strip()]

    @property
    def genai_api_key(self) -> str | None:
        return self.google_api_key or self.gemini_api_key

    @model_validator(mode="after")
    def secure_production_settings(self) -> "Settings":
        if self.app_env == "production" and "*" in self.cors_origins:
            raise ValueError("CORS no puede aceptar '*' en producción")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
