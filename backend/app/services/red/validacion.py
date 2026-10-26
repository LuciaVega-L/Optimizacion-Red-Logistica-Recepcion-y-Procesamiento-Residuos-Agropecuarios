"""Validaciones de consistencia de la red (dimensiones, valores negativos, balance)."""
from app.schemas.red import ProblemaTransporte


def validar(problema: ProblemaTransporte) -> list[str]:
    errores = []
    n, m = len(problema.fuentes), len(problema.plantas)
    if len(problema.oferta) != n:
        errores.append("La oferta no coincide con el número de fuentes.")
    if len(problema.demanda) != m:
        errores.append("La demanda no coincide con el número de plantas.")
    if len(problema.costos) != n or any(len(f) != m for f in problema.costos):
        errores.append("La matriz de costos debe ser fuentes x plantas.")
    return errores


def esta_balanceado(problema: ProblemaTransporte) -> bool:
    return abs(sum(problema.oferta) - sum(problema.demanda)) < 1e-9
