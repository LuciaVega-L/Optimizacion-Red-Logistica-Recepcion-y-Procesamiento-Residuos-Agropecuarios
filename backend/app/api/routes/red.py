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


@router.get("/escenarios/{nombre}/problema")
def obtener_problema(nombre: str, incluir_costo_operativo: bool = True):
    """Escenario ya convertido: oferta, capacidades y matriz de costos calculada."""
    config = repositorio.cargar_escenario(nombre)
    return repositorio.a_problema(config, incluir_costo_operativo)
