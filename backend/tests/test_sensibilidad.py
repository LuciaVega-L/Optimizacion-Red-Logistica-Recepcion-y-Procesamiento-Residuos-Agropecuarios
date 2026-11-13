import pytest

from app.schemas.red import Escenario
from app.services.exacto.solver import resolver, resolver_detallado
from app.services.red import repositorio
from app.services.sensibilidad import analisis
from app.services.sensibilidad.escenarios import aplicar


@pytest.fixture(scope="module")
def caso_base():
    return repositorio.a_problema(repositorio.cargar_escenario())


def _con(problema, **cambios):
    return problema.model_copy(update=cambios, deep=True)


def test_aumento_costos(problema_pequeno):
    nuevo = aplicar(problema_pequeno, Escenario(nombre="combustible", variacion_costos_pct=10))
    assert nuevo.costos[0][0] == pytest.approx(4 * 1.1)
    assert problema_pequeno.costos[0][0] == 4          # el original no cambia


def test_combustible_solo_afecta_transporte(caso_base):
    nuevo = aplicar(caso_base, Escenario(nombre="combustible", variacion_costos_pct=10))
    # E01→P1: 25 km * 1320 + 25 000 (el costo operativo no sube)
    assert nuevo.costos[0][0] == pytest.approx(25 * 1320 + 25000)
    assert caso_base.costo_km_ton == 1200


def test_variacion_de_una_planta(caso_base):
    nuevo = aplicar(caso_base, Escenario(nombre="cuello P3", variacion_demanda_pct=-30,
                                         demanda_objetivo="P3"))
    assert nuevo.demanda == pytest.approx([500, 350, 315, 400])
    with pytest.raises(ValueError):
        aplicar(caso_base, Escenario(nombre="x", demanda_objetivo="P9"))


def test_precio_sombra_dentro_del_rango(caso_base):
    z0 = resolver(caso_base).costo_total
    r = analisis.rangos(caso_base)
    p1 = r["capacidad"][0]
    assert (p1["minimo"], p1["maximo"]) == pytest.approx((340, 530))
    demanda = list(caso_base.demanda)
    demanda[0] += 20
    z1 = resolver(_con(caso_base, demanda=demanda)).costo_total
    assert z1 - z0 == pytest.approx(p1["precio_sombra"] * 20)

    e01 = r["oferta"][0]
    oferta = list(caso_base.oferta)
    oferta[0] += 30
    z2 = resolver(_con(caso_base, oferta=oferta)).costo_total
    assert z2 - z0 == pytest.approx(e01["precio_sombra"] * 30)


def test_rango_de_costo_de_ruta_basica(caso_base):
    r = {f["ruta"]: f for f in analisis.rangos(caso_base)["costos"]}
    ruta = r["E02→P1"]
    assert ruta["basica"] and (ruta["minimo"], ruta["maximo"]) == pytest.approx((53800, 127000))
    d0 = resolver_detallado(caso_base)
    costos = [list(f) for f in caso_base.costos]
    costos[1][0] = 126_000                               # dentro del rango
    assert analisis.base_se_mantiene(d0, _con(caso_base, costos=costos))
    costos[1][0] = 128_000                               # fuera del rango
    assert not analisis.base_se_mantiene(d0, _con(caso_base, costos=costos))


def test_rango_de_costo_de_ruta_no_basica(caso_base):
    ruta = {f["ruta"]: f for f in analisis.rangos(caso_base)["costos"]}["E01→P1"]
    assert not ruta["basica"]
    assert ruta["costo_reducido"] == pytest.approx(39600)
    assert ruta["maximo"] is None                        # puede subir sin límite


def test_simular_escenarios(caso_base):
    escenarios = analisis.escenarios_predefinidos(caso_base)
    salida = analisis.simular(caso_base, escenarios)
    assert salida["base"]["costo_total"] == pytest.approx(132_532_000)
    por_nombre = {e["nombre"]: e for e in salida["escenarios"]}
    # Puerto Gaitán tiene 160 t ociosas: bajar 30 % su capacidad (−120 t) no cambia nada
    p4 = por_nombre["Cuello de botella P4 (−30 %)"]
    assert p4["variacion_costo"] == pytest.approx(0) and p4["base_optima_se_mantiene"]
    assert por_nombre["Combustible +10 %"]["base_optima_se_mantiene"]
    assert por_nombre["Cuello de botella P3 (−30 %)"]["variacion_costo"] > 0
    assert caso_base.demanda == [500, 350, 450, 400]     # el original no cambia


def test_simular_con_ag_no_rompe_si_ag_no_esta_listo(caso_base):
    salida = analisis.simular(caso_base, [Escenario(nombre="c+10", variacion_costos_pct=10)],
                              incluir_ag=True)
    fila = salida["escenarios"][0]
    assert "genetico" in fila and fila["costo_total"] > 0
