"""Endpoints: Gestión de la red: cargar escenarios base, agregar agroempresas y plantas."""
from fastapi import APIRouter

from app.services.red import repositorio

router = APIRouter()


@router.get("/escenarios")
def listar_escenarios():
    return repositorio.listar_escenarios()


@router.get("/escenarios/{nombre}")
def obtener_escenario(nombre: str):
    return repositorio.cargar_escenario(nombre)
