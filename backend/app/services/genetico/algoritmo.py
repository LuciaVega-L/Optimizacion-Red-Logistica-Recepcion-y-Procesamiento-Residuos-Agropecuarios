"""Bucle principal del AG: población → evaluación → selección → cruce → mutación."""
from app.schemas.red import ParametrosAG, ProblemaTransporte
from app.schemas.resultados import ResultadoGenetico


def ejecutar(problema: ProblemaTransporte, parametros: ParametrosAG) -> ResultadoGenetico:
    """TODO (Rol 3): ejecutar el AG y devolver la mejor solución + historial de fitness."""
    raise NotImplementedError
