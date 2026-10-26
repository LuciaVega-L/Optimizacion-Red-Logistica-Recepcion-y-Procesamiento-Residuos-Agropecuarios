from app.schemas.red import Escenario
from app.services.sensibilidad.escenarios import aplicar


def test_aumento_costos(problema_pequeno):
    nuevo = aplicar(problema_pequeno, Escenario(nombre="combustible", variacion_costos_pct=10))
    assert nuevo.costos[0][0] == 4 * 1.1
