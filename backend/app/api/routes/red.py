"""Endpoints: Gestión de la red: cargar escenarios base, validar y convertir la red editada."""
from fastapi import APIRouter, HTTPException

from app.schemas.red import ProblemaTransporte
from app.services.red import repositorio
from app.services.red.validacion import estado_balance, validar

router = APIRouter()


@router.get("/escenarios")
def listar_escenarios():
    return repositorio.listar_escenarios()


@router.get("/escenarios/{nombre}")
def obtener_escenario(nombre: str):
    if nombre not in repositorio.listar_escenarios():
        raise HTTPException(status_code=404, detail=f"No existe el escenario '{nombre}'.")
    return repositorio.cargar_escenario(nombre)


@router.get("/escenarios/{nombre}/problema")
def obtener_problema(nombre: str, incluir_costo_operativo: bool = True):
    """Escenario ya convertido: oferta, capacidades y matriz de costos calculada."""
    config = obtener_escenario(nombre)
    return repositorio.a_problema(config, incluir_costo_operativo)


@router.post("/problema", response_model=ProblemaTransporte)
def config_a_problema(config: dict, incluir_costo_operativo: bool = True):
    """Convierte una red editada en la interfaz (mismo formato que dataConfig.json)."""
    try:
        return repositorio.a_problema(config, incluir_costo_operativo)
    except (ValueError, KeyError, TypeError) as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/validar")
def validar_problema(problema: ProblemaTransporte):
    errores = validar(problema)
    return {"valido": not errores, "errores": errores,
            "balance": None if errores else estado_balance(problema)}
