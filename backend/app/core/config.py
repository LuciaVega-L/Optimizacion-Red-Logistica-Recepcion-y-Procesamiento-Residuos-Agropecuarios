from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/.env, sin importar desde qué carpeta se arranque uvicorn
# (p. ej. desde la raíz del repo con --app-dir backend, como en .claude/launch.json)
ARCHIVO_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    app_nombre: str = "EcoResiduos API"

    cors_origenes: str = "http://localhost:5173,http://127.0.0.1:5173"
    cors_localhost: bool = True

    fuente_datos: str = "json"
    database_url: str = ""        # cadena de conexión de Supabase (Session pooler)
    database_password: str = ""   

    model_config = SettingsConfigDict(env_file=ARCHIVO_ENV, extra="ignore")

    @property
    def usa_bd(self) -> bool:
        return self.fuente_datos.strip().lower() in {"bd", "supabase", "postgres", "postgresql"}

    @property
    def cors_origenes_lista(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origenes.split(",") if o.strip()]

    @property
    def cors_regex(self) -> str | None:
        """localhost o 127.0.0.1 con cualquier puerto (solo si CORS_LOCALHOST=true)."""
        return r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$" if self.cors_localhost else None


settings = Settings()
