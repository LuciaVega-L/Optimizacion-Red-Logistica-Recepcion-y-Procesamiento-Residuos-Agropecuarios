from app.schemas.red import ParametrosAG
from app.services.exacto import solver
from app.services.genetico import algoritmo


def test_resuelve_problema_pequeno(problema_pequeno):
    res = algoritmo.ejecutar(problema_pequeno, ParametrosAG(poblacion=30, generaciones=40, semilla=1))
    exacto = solver.resolver(problema_pequeno)
    assert res.factible
    assert res.costo_total >= exacto.costo_total - 1e-6
    for i, fila in enumerate(res.asignacion):
        assert abs(sum(fila) - problema_pequeno.oferta[i]) < 1e-3


def test_devuelve_historial_de_convergencia(problema_pequeno):
    res = algoritmo.ejecutar(problema_pequeno, ParametrosAG(poblacion=20, generaciones=25, semilla=3))
    assert len(res.historial_fitness) == 25 + 1
    assert all(b <= a + 1e-6 for a, b in zip(res.historial_fitness, res.historial_fitness[1:]))
    assert abs(res.historial_fitness[-1] - res.costo_total) < 1.0


def test_parametros_invalidos_se_rechazan():
    import pytest
    from pydantic import ValidationError
    for malo in ({"seleccion": "ruletta"}, {"tipo_cruce": "tres_puntos"}, {"poblacion": 0}, {"tasa_cruce": 5}):
        with pytest.raises(ValidationError):
            ParametrosAG(**malo)
