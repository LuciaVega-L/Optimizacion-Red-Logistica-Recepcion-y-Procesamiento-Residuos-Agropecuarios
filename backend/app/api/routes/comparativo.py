"""Endpoints: Comparar exacto vs. genético (costo, tiempo, gap)."""
from fastapi import APIRouter

from app.schemas.red import ParametrosAG, ProblemaTransporte
from app.schemas.resultados import ReporteComparativo
from app.services.comparativo import reporte

router = APIRouter()


@router.post("/reporte", response_model=ReporteComparativo)
def generar_reporte(problema: ProblemaTransporte, parametros: ParametrosAG):
    return reporte.generar(problema, parametros)
