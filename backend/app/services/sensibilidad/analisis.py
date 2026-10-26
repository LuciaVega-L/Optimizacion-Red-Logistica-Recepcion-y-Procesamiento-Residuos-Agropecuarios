"""Ejecuta los escenarios y recopila costo, precios sombra y rangos de variación."""
from app.schemas.red import Escenario, ProblemaTransporte


def simular(problema: ProblemaTransporte, escenarios: list[Escenario]) -> list[dict]:
    """TODO: para cada escenario, aplicar variación, resolver con exacto y AG, y comparar."""
    raise NotImplementedError
