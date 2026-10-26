"""Configuración global leída desde variables de entorno (.env)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_nombre: str = "EcoResiduos API"
    cors_origenes: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origenes_lista(self) -> list[str]:
        return [o.strip() for o in self.cors_origenes.split(",")]


settings = Settings()
