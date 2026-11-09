import pytest

from app.services.comparativo.escalabilidad import comparar_tamanos
from app.services.comparativo.metricas import gap_porcentual
from app.services.red import repositorio
from app.services.red.generador import generar_red
from app.services.red.validacion import validar


def test_gap():
    assert gap_porcentual(110, 100) == 10


@pytest.mark.parametrize("n, m", [(20, 4), (50, 6), (100, 10)])
def test_generador_produce_redes_validas(n, m):
    problema = repositorio.a_problema(generar_red(n, m))
    assert len(problema.fuentes) == n and len(problema.plantas) == m
    assert validar(problema) == []
    assert sum(problema.demanda) >= sum(problema.oferta)


def test_generador_es_reproducible():
    assert generar_red(20, 4, semilla=7) == generar_red(20, 4, semilla=7)


def test_escalabilidad_exacto():
    filas = comparar_tamanos([(20, 4), (50, 6)], incluir_ag=False)
    assert [f["variables"] for f in filas] == [80, 300]
    assert all(f["costo_exacto"] > 0 for f in filas)
