"""Genera el reporte comparativo: costos, tiempos y gap."""
from app.schemas.red import ParametrosAG, ProblemaTransporte
from app.schemas.resultados import ReporteComparativo
from app.services.comparativo.metricas import gap_porcentual
from app.services.exacto import solver
from app.services.genetico import algoritmo


def generar(problema: ProblemaTransporte, parametros: ParametrosAG) -> ReporteComparativo:
    exacto = solver.resolver(problema)
    genetico = algoritmo.ejecutar(problema, parametros)
    return ReporteComparativo(
        exacto=exacto,
        genetico=genetico,
        gap_pct=gap_porcentual(genetico.costo_total, exacto.costo_total),
    )
