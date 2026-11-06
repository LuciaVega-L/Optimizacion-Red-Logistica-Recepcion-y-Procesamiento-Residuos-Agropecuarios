"""Cliente unico de Supabase para todo el backend.

Usa la clave SECRETA del proyecto (salta RLS). Por eso solo se crea aquí,
en el servidor; el frontend nunca recibe esta clave.
"""
from functools import lru_cache

from postgrest.exceptions import APIError
from supabase import Client, create_client

from app.core.config import settings


class ErrorBaseDatos(RuntimeError):
    """Error devuelto por Supabase/PostgreSQL, con un mensaje legible."""

    def __init__(self, mensaje: str, codigo: str | None = None):
        super().__init__(mensaje)
        self.codigo = codigo


class SupabaseNoConfigurado(ErrorBaseDatos):
    pass


class EscenarioNoEncontrado(ErrorBaseDatos):
    pass


@lru_cache
def obtener_cliente() -> Client:
    if not settings.supabase_url or not settings.supabase_secret_key:
        raise SupabaseNoConfigurado(
            "Faltan SUPABASE_URL y/o SUPABASE_SECRET_KEY en backend/.env"
        )
    return create_client(settings.supabase_url, settings.supabase_secret_key)


def ejecutar(consulta):
    """Ejecuta una consulta de supabase-py y traduce los errores de PostgreSQL."""
    try:
        return consulta.execute().data
    except APIError as e:
        codigo = getattr(e, "code", None)
        mensaje = getattr(e, "message", None) or str(e)
        if codigo == "P0002":  # lanzado por las funciones cuando no existe el escenario
            raise EscenarioNoEncontrado(mensaje, codigo) from e
        raise ErrorBaseDatos(mensaje, codigo) from e