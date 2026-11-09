"""Endpoints: Comparar exacto vs. genético (costo, tiempo, gap) y escalabilidad."""
from fastapi import APIRouter
from pydantic import BaseModel

from app.schemas.red import ParametrosAG, ProblemaTransporte
from app.schemas.resultados import ReporteComparativo
from app.services.comparativo import escalabilidad, reporte

router = APIRouter()


@router.post("/reporte", response_model=ReporteComparativo)
def generar_reporte(problema: ProblemaTransporte, parametros: ParametrosAG):
    return reporte.generar(problema, parametros)


class SolicitudEscalabilidad(BaseModel):
    tamanos: list[tuple[int, int]] = escalabilidad.TAMANOS_POR_DEFECTO
    parametros_ag: ParametrosAG | None = None
    incluir_ag: bool = True
    semillas_ag: list[int] = [1, 2, 3]


@router.post("/escalabilidad")
def comparar_tamanos(solicitud: SolicitudEscalabilidad):
    return escalabilidad.comparar_tamanos(solicitud.tamanos, solicitud.parametros_ag,
                                          solicitud.incluir_ag, solicitud.semillas_ag)
