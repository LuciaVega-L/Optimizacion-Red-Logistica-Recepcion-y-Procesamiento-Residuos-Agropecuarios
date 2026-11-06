"""Dependencias compartidas por los endpoints."""
from fastapi import HTTPException

from app.core.config import settings


def requiere_bd() -> None:
    """Los endpoints de historial solo funcionan con la base de datos activa."""
    if not settings.usa_bd:
        raise HTTPException(503, "La base de datos no está activa: ponga FUENTE_DATOS=bd en backend/.env")
