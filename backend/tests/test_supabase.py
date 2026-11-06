"""Pruebas de integracion con Supabase.

Se saltan si FUENTE_DATOS no es "supabase" en backend/.env, para que
`pytest` siga funcionando sin base de datos. Para ejecutarlas:

    FUENTE_DATOS=supabase  (en backend/.env)
    pytest tests/test_supabase.py -v

Trabajan sobre un escenario temporal "_prueba_pytest" que se borra al final;
no tocan el escenario base.
"""
import json

import pytest

from app.core.config import settings
from app.db.supabase_cliente import ErrorBaseDatos, EscenarioNoEncontrado
from app.schemas.resultados import ResultadoExacto, ResultadoGenetico
from app.services.red import repositorio

pytestmark = pytest.mark.skipif(not settings.usa_supabase, reason="FUENTE_DATOS != supabase")

NOMBRE = "_prueba_pytest"
COPIA = "_prueba_pytest_copia"


def leer_json_base() -> dict:
    with open(repositorio.DIR_ESCENARIOS / f"{repositorio.ESCENARIO_BASE}.json", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def bd():
    from app.services.red import repositorio_supabase as bd

    for n in (NOMBRE, COPIA):
        bd.eliminar_escenario(n)
    bd.guardar_escenario(NOMBRE, leer_json_base(), descripcion="Escenario temporal de pytest")
    yield bd
    for n in (NOMBRE, COPIA):
        bd.eliminar_escenario(n)


def test_ida_y_vuelta_mismo_formato(bd):
    original = leer_json_base()
    en_bd = bd.cargar_escenario(NOMBRE)
    for clave in ("parametros_globales", "plantas", "agroempresas", "matriz_distancias_km"):
        assert en_bd[clave] == original[clave], clave
    assert repositorio.a_problema(en_bd) == repositorio.a_problema(original)


def test_escenario_inexistente(bd):
    with pytest.raises(EscenarioNoEncontrado):
        bd.cargar_escenario("no-existe-este-escenario")


def test_no_duplica_sin_reemplazar(bd):
    with pytest.raises(ErrorBaseDatos):
        bd.guardar_escenario(NOMBRE, bd.cargar_escenario(NOMBRE))


def test_rechaza_oferta_negativa(bd):
    config = bd.cargar_escenario(NOMBRE)
    config["agroempresas"][0]["oferta_ton_sem"] = -1
    with pytest.raises(ErrorBaseDatos):
        bd.guardar_escenario(NOMBRE, config, reemplazar=True)
    # la transacción se revierte: el escenario sigue intacto
    assert bd.cargar_escenario(NOMBRE)["agroempresas"][0]["oferta_ton_sem"] >= 0


def test_guardar_ejecuciones_y_comparativo(bd):
    problema = repositorio.a_problema(bd.cargar_escenario(NOMBRE))
    n, m = len(problema.oferta), len(problema.demanda)
    # asignación factible simple: cada empresa a la planta más barata con capacidad
    cap = list(problema.demanda)
    x = [[0.0] * m for _ in range(n)]
    for i in range(n):
        restante = problema.oferta[i]
        for j in sorted(range(m), key=lambda j: problema.costos[i][j]):
            t = min(restante, cap[j]); x[i][j] += t; cap[j] -= t; restante -= t
    costo = sum(problema.costos[i][j] * x[i][j] for i in range(n) for j in range(m))

    exacto = ResultadoExacto(metodo="exacto", costo_total=costo, asignacion=x, tiempo_s=0.01,
                             factible=True, precios_sombra_oferta=[0.0] * n,
                             precios_sombra_demanda=[0.0] * m)
    genetico = ResultadoGenetico(metodo="genetico", costo_total=costo * 1.05, asignacion=x,
                                 tiempo_s=0.5, factible=True, historial_fitness=[1e-9])
    id_ex = bd.guardar_ejecucion(NOMBRE, exacto, parametros={"solver": "prueba"})
    id_ag = bd.guardar_ejecucion(NOMBRE, genetico, parametros={"poblacion": 10})

    guardada = bd.obtener_ejecucion(id_ex)
    assert len(guardada["asignaciones"]) == n * m
    assert len(guardada["precios_sombra"]) == n + m
    assert abs(guardada["costo_transporte"] + guardada["costo_operativo"] - costo) < 1e-6

    bd.registrar_comparativo(id_ex, id_ag)
    comp = bd.listar_comparativos(NOMBRE)[0]
    assert comp["gap_pct"] == pytest.approx(5.0)


def test_clonar_no_modifica_original(bd):
    bd.clonar_escenario(NOMBRE, COPIA, variaciones={"variacion_costos_pct": 10})
    copia = bd.cargar_escenario(COPIA)
    assert copia["_meta"]["variaciones"] == {"variacion_costos_pct": 10}
    copia["agroempresas"][0]["oferta_ton_sem"] = 999
    bd.guardar_escenario(COPIA, copia, reemplazar=True)
    assert bd.cargar_escenario(NOMBRE)["agroempresas"][0]["oferta_ton_sem"] != 999