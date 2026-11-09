"""Pruebas del módulo exacto.

El caso base (dataConfig.json) sirve de prueba automática: si cambian los datos o el modelo,
estos valores dejan de coincidir con las tablas del informe y el test falla.
"""
import pytest

from app.schemas.red import ProblemaTransporte
from app.services.exacto.modelo import balancear, siguiente_id
from app.services.exacto.solver import ProblemaInvalido, resolver
from app.services.exacto.verificacion import es_factible
from app.services.red import repositorio

Z_CASO_BASE = 132_532_000  # COP/semana
U_CASO_BASE = [44400, 154800, 87600, 94800, 150000, 121200, 105600, 156000, 39600, 79200]
V_CASO_BASE = [-29000, -11600, -47200, 0]


@pytest.fixture(scope="module")
def caso_base():
    problema = repositorio.a_problema(repositorio.cargar_escenario())
    return problema, resolver(problema)


def test_costo_optimo_caso_base(caso_base):
    _, res = caso_base
    assert res.estado == "Optimal"
    assert res.costo_total == pytest.approx(Z_CASO_BASE)
    assert res.factible and res.optimalidad_verificada


def test_nodo_ficticio_caso_base(caso_base):
    _, res = caso_base
    assert res.nodo_ficticio.tipo == "fuente"
    assert res.nodo_ficticio.id == "E11"
    assert res.nodo_ficticio.cantidad == pytest.approx(160)
    # Las 160 t de capacidad ociosa quedan en Puerto Gaitán
    assert res.holgura_plantas == pytest.approx([0, 0, 0, 160])
    assert res.nodo_ficticio.flujos == pytest.approx([0, 0, 0, 160])


def test_precios_sombra_caso_base(caso_base):
    _, res = caso_base
    assert res.precios_sombra_oferta == pytest.approx(U_CASO_BASE)
    assert res.precios_sombra_demanda == pytest.approx(V_CASO_BASE)
    assert all(v <= 0 for v in res.precios_sombra_demanda)


def test_holgura_complementaria(caso_base):
    problema, res = caso_base
    for i, fila in enumerate(res.asignacion):
        for j, x in enumerate(fila):
            assert res.costos_reducidos[i][j] >= -1e-6
            assert x * res.costos_reducidos[i][j] == pytest.approx(0, abs=1e-3)
    for v, h in zip(res.precios_sombra_demanda, res.holgura_plantas):
        assert v * h == pytest.approx(0)


def test_base_no_degenerada_con_optimos_alternativos(caso_base):
    _, res = caso_base
    assert len(res.variables_basicas) == 11 + 4 - 1
    assert not res.degenerada
    # E03→P1 y E08→P2 tienen costo reducido 0: hay otras asignaciones con el mismo Z*
    assert set(res.rutas_optimo_alternativo) == {"E03→P1", "E08→P2"}


def test_verificacion_por_restriccion(caso_base):
    _, res = caso_base
    tipos = [f.tipo for f in res.verificacion]
    assert tipos.count("oferta") == 10
    assert tipos.count("capacidad") == 4
    assert tipos.count("no_negatividad") == 1
    assert all(f.cumple for f in res.verificacion)


def test_problema_pequeno_balanceado(problema_pequeno):
    res = resolver(problema_pequeno)
    assert res.nodo_ficticio is None
    assert res.costo_total == pytest.approx(20 * 4 + 20 * 5 + 10 * 3 + 25 * 2)
    assert es_factible(res.asignacion, problema_pequeno.oferta, problema_pequeno.demanda)
    assert max(res.precios_sombra_demanda) == pytest.approx(0)


def test_oferta_mayor_que_capacidad():
    problema = ProblemaTransporte(fuentes=["A", "B"], plantas=["P1"], oferta=[10, 10],
                                  demanda=[15], costos=[[1], [5]])
    res = resolver(problema)
    assert res.nodo_ficticio.tipo == "planta"
    assert res.nodo_ficticio.id == "P2"
    assert res.asignacion == [[10], [5]]           # lo más caro queda sin procesar
    assert res.nodo_ficticio.flujos == pytest.approx([0, 5])
    assert res.factible


def test_problema_invalido():
    problema = ProblemaTransporte(fuentes=["A"], plantas=["P1"], oferta=[-1],
                                  demanda=[5], costos=[[1]])
    with pytest.raises(ProblemaInvalido, match="negativa"):
        resolver(problema)


def test_siguiente_id():
    assert siguiente_id(["E01", "E02", "E10"], "X") == "E11"
    assert siguiente_id(["P1", "P2", "P3", "P4"], "X") == "P5"
    assert siguiente_id(["Norte", "Sur"], "E_FICTICIA") == "E_FICTICIA"


def test_balancear_caso_base():
    b = balancear(repositorio.a_problema(repositorio.cargar_escenario()))
    assert len(b.fuentes) == 11 and b.oferta[-1] == pytest.approx(160)
    assert b.costos[-1] == [0, 0, 0, 0]
