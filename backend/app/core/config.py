"""Configuración global leída desde variables de entorno (.env)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_nombre: str = "EcoResiduos API"
    cors_origenes: str = "http://localhost:5173"

    # Base de datos
    #   FUENTE_DATOS=json -> lee backend/data/escenarios/*.json (sin base de datos)
    #   FUENTE_DATOS=bd   -> PostgreSQL (Supabase) con SQLAlchemy
    fuente_datos: str = "json"
    database_url: str = ""        # cadena de conexión de Supabase (Session pooler)
    database_password: str = ""   # opcional: contraseña aparte, sin tener que codificarla en la URL

    # ignora variables que sobren en el .env (p. ej. las de versiones anteriores)
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def usa_bd(self) -> bool:
        return self.fuente_datos.strip().lower() in {"bd", "supabase", "postgres", "postgresql"}

    @property
    def cors_origenes_lista(self) -> list[str]:
        return [o.strip() for o in self.cors_origenes.split(",")]


settings = Settings()
