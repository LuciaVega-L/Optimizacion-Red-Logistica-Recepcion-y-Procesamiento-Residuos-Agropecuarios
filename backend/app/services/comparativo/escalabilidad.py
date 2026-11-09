"""Comparativo por tamaño de red (HU5): exacto vs. AG en redes de 10, 20, 50 y 100 fuentes."""
import statistics

from app.schemas.red import ParametrosAG
from app.services.comparativo.metricas import gap_porcentual
from app.services.exacto.solver import resolver
from app.services.red import repositorio
from app.services.red.generador import generar_red
from app.services.sensibilidad.analisis import _ejecutar_ag

TAMANOS_POR_DEFECTO = [(10, 4), (20, 4), (50, 6), (100, 10)]


def comparar_tamanos(tamanos=None, parametros_ag: ParametrosAG | None = None,
                     incluir_ag: bool = True, semillas_ag: list[int] | None = None,
                     semilla_red: int = 42) -> list[dict]:
    """Para cada (n_fuentes, n_plantas) genera una red, la resuelve con el exacto y con el AG
    (varias semillas) y reporta costo, tiempo y gap."""
    tamanos = tamanos or TAMANOS_POR_DEFECTO
    semillas_ag = semillas_ag or [1, 2, 3]
    filas = []
    for n, m in tamanos:
        problema = repositorio.a_problema(generar_red(n, m, semilla=semilla_red))
        exacto = resolver(problema)
        fila = {"n_fuentes": n, "n_plantas": m, "variables": n * m,
                "costo_exacto": exacto.costo_total, "tiempo_exacto_s": exacto.tiempo_s}
        if incluir_ag:
            corridas, errores = [], []
            for s in semillas_ag:
                params = (parametros_ag or ParametrosAG()).model_copy(update={"semilla": s})
                ag, error = _ejecutar_ag(problema, params)
                (corridas.append(ag) if ag else errores.append(error))
            if corridas:
                gaps = [gap_porcentual(c["costo_total"], exacto.costo_total) for c in corridas]
                fila.update({
                    "costo_ag_mejor": min(c["costo_total"] for c in corridas),
                    "costo_ag_promedio": statistics.mean(c["costo_total"] for c in corridas),
                    "tiempo_ag_promedio_s": statistics.mean(c["tiempo_s"] for c in corridas),
                    "gap_mejor_pct": min(gaps), "gap_promedio_pct": statistics.mean(gaps),
                    "corridas_factibles": sum(c["factible"] for c in corridas),
                    "corridas": len(corridas),
                })
            if errores:
                fila["error_ag"] = errores[0]
        filas.append(fila)
    return filas
