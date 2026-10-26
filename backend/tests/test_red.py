from app.services.red import repositorio
from app.services.red.validacion import validar


def test_carga_data_config():
    config = repositorio.cargar_escenario("dataConfig")
    assert len(config["agroempresas"]) == 10
    assert len(config["plantas"]) == 4


def test_matriz_costos_calculada():
    problema = repositorio.a_problema(repositorio.cargar_escenario())
    assert validar(problema) == []
    # E01 -> P1: 28 km * 1200 + 25000 costo operativo
    assert problema.costos[0][0] == 28 * 1200 + 25000


def test_capacidad_suficiente():
    problema = repositorio.a_problema(repositorio.cargar_escenario())
    assert sum(problema.oferta) <= sum(problema.demanda)
