"""Configuración global leída desde variables de entorno (.env)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_nombre: str = "EcoResiduos API"
    cors_origenes: str = "http://localhost:5173"
    # Base de datos: "json" (archivos en data/escenarios) o "supabase"
    fuente_datos: str = "json"
    supabase_url: str = ""
    supabase_secret_key: str = ""

    @property
    def usa_supabase(self) -> bool:
        return self.fuente_datos.strip().lower() == "supabase"
    model_config = SettingsConfigDict(env_file=".env")

    @property
    def cors_origenes_lista(self) -> list[str]:
        return [o.strip() for o in self.cors_origenes.split(",")]


settings = Settings()
