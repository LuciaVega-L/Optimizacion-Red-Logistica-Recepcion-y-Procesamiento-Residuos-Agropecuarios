"""Métricas de comparación."""


def gap_porcentual(costo_ag: float, costo_optimo: float) -> float:
    if costo_optimo == 0:
        return 0.0
    return (costo_ag - costo_optimo) / costo_optimo * 100
