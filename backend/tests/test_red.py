import math

import pytest

from app.schemas.red import ProblemaTransporte
from app.services.red import repositorio
from app.services.red.validacion import estado_balance, validar


def test_carga_data_config():
    config = repositorio.cargar_escenario("dataConfig")
    assert len(config["agroempresas"]) == 10
    assert len(config["plantas"]) == 4


def test_matriz_costos_calculada():
    problema = repositorio.a_problema(repositorio.cargar_escenario())
    assert validar(problema) == []
    # E01 -> P1: 25 km * 1200 + 25000 costo operativo (Tabla III del informe: 55 000)
    assert problema.costos[0][0] == 25 * 1200 + 25000 == 55000


def test_tabla_iii_del_informe():
    """La matriz de costos del software debe coincidir con la Tabla III del informe."""
    tabla_iii = {
        "E01": [55000, 32800, 148400, 276000], "E02": [125800, 144400, 218000, 154800],
        "E03": [58600, 76000, 90800, 286800], "E04": [101800, 120400, 47600, 330000],
        "E05": [202600, 155200, 236000, 150000], "E06": [92200, 110800, 74000, 313200],
        "E07": [76600, 94000, 71600, 308400], "E08": [127000, 144400, 128000, 228000],
        "E09": [46600, 28000, 143600, 278400], "E10": [127000, 145600, 32000, 350400],
    }
    problema = repositorio.a_problema(repositorio.cargar_escenario())
    for i, fuente in enumerate(problema.fuentes):
        assert problema.costos[i] == tabla_iii[fuente]


def test_capacidad_suficiente():
    problema = repositorio.a_problema(repositorio.cargar_escenario())
    assert sum(problema.oferta) == 1540
    assert sum(problema.demanda) == 1700
    assert estado_balance(problema)["estado"] == "oferta_menor"


def _base(**cambios):
    datos = dict(fuentes=["A", "B"], plantas=["P1", "P2"], oferta=[10, 20],
                 demanda=[15, 15], costos=[[1, 2], [3, 4]])
    datos.update(cambios)
    return ProblemaTransporte(**datos)


def test_problema_valido():
    assert validar(_base()) == []
    assert estado_balance(_base())["estado"] == "balanceado"


@pytest.mark.parametrize("cambios, fragmento", [
    ({"oferta": [-5, 20]}, "negativa"),
    ({"demanda": [15, math.nan]}, "no es un número"),
    ({"costos": [[1, -2], [3, 4]]}, "negativo"),
    ({"fuentes": ["A", "A"]}, "repetidos"),
    ({"plantas": ["P1", " "]}, "sin identificador"),
    ({"oferta": [10]}, "no coincide"),
    ({"costos": [[1, 2], [3]]}, "fuentes x plantas"),
    ({"oferta": [0, 0]}, "mayor que cero"),
    ({"fuentes": [], "oferta": [], "costos": []}, "al menos una"),
])
def test_errores_de_validacion(cambios, fragmento):
    errores = validar(_base(**cambios))
    assert any(fragmento in e for e in errores), errores


def test_config_sin_distancia():
    config = repositorio.cargar_escenario()
    del config["matriz_distancias_km"]["E03"]["P2"]
    with pytest.raises(ValueError, match="E03→P2"):
        repositorio.a_problema(config)


def test_oferta_mayor_que_capacidad():
    assert estado_balance(_base(oferta=[20, 20]))["estado"] == "oferta_mayor"
