"""Conexión a PostgreSQL: motor de SQLAlchemy, sesiones y manejo de errores."""
from contextlib import contextmanager
from functools import lru_cache
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import DBAPIError, OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


class ErrorBaseDatos(RuntimeError):
    """Error de la base de datos con un mensaje legible y el código HTTP sugerido."""

    def __init__(self, mensaje: str, codigo_http: int = 400, codigo_pg: str | None = None):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.codigo_http = codigo_http
        self.codigo_pg = codigo_pg


class BDNoConfigurada(ErrorBaseDatos):
    def __init__(self, mensaje: str):
        super().__init__(mensaje, 503)


class EscenarioNoEncontrado(ErrorBaseDatos):
    def __init__(self, mensaje: str):
        super().__init__(mensaje, 404, "P0002")


# códigos de PostgreSQL -> código HTTP
_HTTP_POR_PG = {
    "P0002": 404,   # no existe (lanzado por las funciones SQL)
    "23505": 409,   # nombre duplicado
    "23514": 422,   # viola un CHECK (p. ej. oferta negativa)
    "23502": 422,   # falta un campo obligatorio
    "22023": 422,   # dato inválido (p. ej. matriz de tamaño incorrecto)
    "22P02": 422,   # formato inválido
    "P0001": 422,   # raise exception de las funciones
}


def traducir_error(e: Exception) -> ErrorBaseDatos:
    if isinstance(e, ErrorBaseDatos):
        return e
    if isinstance(e, OperationalError):
        return ErrorBaseDatos(f"No se pudo conectar a la base de datos: {e.orig}", 503)
    if isinstance(e, DBAPIError) and e.orig is not None:
        codigo = getattr(e.orig, "pgcode", None)
        diag = getattr(e.orig, "diag", None)
        mensaje = (getattr(diag, "message_primary", None) or str(e.orig)).strip()
        if codigo == "P0002":
            return EscenarioNoEncontrado(mensaje)
        return ErrorBaseDatos(mensaje, _HTTP_POR_PG.get(codigo, 400), codigo)
    return ErrorBaseDatos(str(e), 500)


def _url_conexion():
    if not settings.database_url:
        raise BDNoConfigurada("Falta DATABASE_URL en backend/.env (o FUENTE_DATOS no es 'bd')")
    url = settings.database_url.strip()
    if settings.database_password:
        # quita el marcador de Supabase y deja que SQLAlchemy codifique la contraseña
        url = url.replace(":[YOUR-PASSWORD]@", "@")
        url_obj = make_url(url).set(password=settings.database_password)
    else:
        url_obj = make_url(url)
    if url_obj.drivername in ("postgres", "postgresql"):
        url_obj = url_obj.set(drivername="postgresql+psycopg2")
    if url_obj.host and url_obj.host.endswith("supabase.com") and "sslmode" not in url_obj.query:
        url_obj = url_obj.update_query_dict({"sslmode": "require"})
    return url_obj


@lru_cache
def obtener_engine() -> Engine:
    return create_engine(
        _url_conexion(),
        pool_pre_ping=True,     # reconecta si el pooler cerró la conexión
        pool_size=5,
        max_overflow=5,
        connect_args={"connect_timeout": 10},
    )


@lru_cache
def _fabrica() -> sessionmaker:
    return sessionmaker(bind=obtener_engine(), expire_on_commit=False)


@contextmanager
def sesion() -> Iterator[Session]:
    """Sesión con commit automático; si algo falla hace rollback y traduce el error."""
    s: Session = _fabrica()()
    try:
        yield s
        s.commit()
    except Exception as e:
        s.rollback()
        raise traducir_error(e) from e
    finally:
        s.close()
