"""Endpoints: Simular escenarios y obtener precios sombra y rangos."""
from fastapi import APIRouter, HTTPException

from app.schemas.red import Escenario, ProblemaTransporte, SolicitudSensibilidad
from app.services.exacto.solver import ProblemaInvalido
from app.services.sensibilidad import analisis

router = APIRouter()


@router.post("/simular")
def simular(solicitud: SolicitudSensibilidad):
    try:
        return analisis.simular(solicitud.problema, solicitud.escenarios,
                                solicitud.incluir_ag, solicitud.parametros_ag)
    except ProblemaInvalido as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/rangos")
def rangos(problema: ProblemaTransporte):
    try:
        return analisis.rangos(problema)
    except ProblemaInvalido as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post("/escenarios-predefinidos", response_model=list[Escenario])
def escenarios_predefinidos(problema: ProblemaTransporte):
    return analisis.escenarios_predefinidos(problema)
