"""Pruebas de la base de datos: guardar una ejecución y recuperar el historial.

Se saltan si FUENTE_DATOS no es "bd" en backend/.env, para que `pytest`
siga funcionando sin base de datos. Para ejecutarlas:

    python -m pytest tests/test_bd.py -v

Trabajan sobre escenarios temporales "_prueba_pytest*" que se borran al
final; no tocan el escenario base.
"""
import json

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services.red import repositorio

pytestmark = pytest.mark.skipif(not settings.usa_bd, reason="FUENTE_DATOS != bd")

NOMBRE = "_prueba_pytest"
COPIA = "_prueba_pytest_copia"
cliente = TestClient(app)


def leer_json_base() -> dict:
    with open(repositorio.DIR_ESCENARIOS / f"{repositorio.ESCENARIO_BASE}.json", encoding="utf-8") as f:
        return json.load(f)


def asignacion_voraz(problema):
    """Asignación factible sencilla: cada empresa a la planta más barata con capacidad."""
    cap = list(problema.demanda)
    x = [[0.0] * len(cap) for _ in problema.oferta]
    for i, oferta in enumerate(problema.oferta):
        for j in sorted(range(len(cap)), key=lambda j: problema.costos[i][j]):
            t = min(oferta, cap[j]); x[i][j] += t; cap[j] -= t; oferta -= t
    costo = sum(problema.costos[i][j] * x[i][j] for i in range(len(x)) for j in range(len(cap)))
    return x, costo


@pytest.fixture(scope="module", autouse=True)
def escenario_temporal():
    for n in (NOMBRE, COPIA):
        cliente.delete(f"/api/escenarios/{n}")
    r = cliente.post("/api/escenarios", json={"nombre": NOMBRE, "config": leer_json_base(),
                                              "descripcion": "temporal de pytest"})
    assert r.status_code == 201, r.text
    yield r.json()
    for n in (NOMBRE, COPIA):
        cliente.delete(f"/api/escenarios/{n}")


def test_tabla_escenarios_tiene_id_nombre_fecha_y_parametros(escenario_temporal):
    e = escenario_temporal
    assert e["id"] and e["nombre"] == NOMBRE and e["fecha"]
    p = e["parametros_entrada"]
    base = leer_json_base()
    assert p["oferta"] == [a["oferta_ton_sem"] for a in base["agroempresas"]]
    assert p["demanda"] == [pl["capacidad_maxima_ton_sem"] for pl in base["plantas"]]
    # costos = matriz cᵢⱼ que usan los solucionadores
    assert p["costos"] == repositorio.a_problema(base).costos


def test_mismo_formato_que_dataconfig():
    base = leer_json_base()
    en_bd = cliente.get(f"/api/escenarios/{NOMBRE}/config").json()
    for clave in ("parametros_globales", "plantas", "agroempresas", "matriz_distancias_km"):
        assert en_bd[clave] == base[clave], clave


def test_guardar_ejecucion_y_recuperar_historial():
    problema = repositorio.a_problema(leer_json_base())
    x, costo = asignacion_voraz(problema)

    r_ag = cliente.post("/api/resultados", json={
        "escenario": NOMBRE, "algoritmo_utilizado": "genetico", "costo_total": costo * 1.05,
        "tiempo_ejecucion_ms": 850.5, "matriz_flujos": x, "factible": True,
        "parametros_algoritmo": {"poblacion": 100, "generaciones": 500}})
    assert r_ag.status_code == 201, r_ag.text
    ag = r_ag.json()
    assert ag["algoritmo_utilizado"] == "Genético"
    assert ag["gap_desviacion"] is None            # aún no hay resultado exacto

    r_ex = cliente.post("/api/resultados", json={
        "escenario": NOMBRE, "algoritmo_utilizado": "Exacto", "costo_total": costo,
        "tiempo_ejecucion_ms": 12.3, "matriz_flujos": x, "factible": True,
        "precios_sombra_oferta": [0.0] * len(problema.oferta),
        "precios_sombra_demanda": [0.0] * len(problema.demanda)})
    assert r_ex.status_code == 201, r_ex.text
    ex = r_ex.json()
    assert ex["gap_desviacion"] == 0
    assert ex["costo_transporte"] + ex["costo_operativo"] == pytest.approx(costo)
    assert ex["matriz_flujos_json"]["toneladas"] == x
    assert ex["matriz_flujos_json"]["agroempresas"][0] == "E01"
    assert len(ex["precios_sombra"]) == len(problema.oferta) + len(problema.demanda)

    # al guardar el exacto se completa el gap del genético
    ag = cliente.get(f"/api/resultados/{ag['id']}").json()
    assert ag["gap_desviacion"] == pytest.approx(5.0)
    assert ag["resultado_exacto_id"] == ex["id"]

    historial = cliente.get("/api/resultados", params={"escenario": NOMBRE}).json()
    assert [h["algoritmo_utilizado"] for h in historial] == ["Exacto", "Genético"]

    comp = cliente.get("/api/resultados/comparativo", params={"escenario": NOMBRE}).json()
    assert len(comp) == 1
    assert comp[0]["gap_desviacion"] == pytest.approx(5.0)
    assert comp[0]["tiempo_exacto_ms"] == pytest.approx(12.3)

    escenarios = cliente.get("/api/escenarios").json()
    fila = next(e for e in escenarios if e["nombre"] == NOMBRE)
    assert fila["num_resultados"] == 2


def test_validaciones():
    malo = cliente.post("/api/resultados", json={
        "escenario": NOMBRE, "algoritmo_utilizado": "Exacto", "costo_total": 1,
        "tiempo_ejecucion_ms": 1, "matriz_flujos": [[1, 2]]})
    assert malo.status_code == 422 and "matriz_flujos_json" in malo.text

    alg = cliente.post("/api/resultados", json={
        "escenario": NOMBRE, "algoritmo_utilizado": "Otro", "costo_total": 1,
        "tiempo_ejecucion_ms": 1, "matriz_flujos": [[0]]})
    assert alg.status_code == 422

    assert cliente.get("/api/escenarios/no-existe").status_code == 404
    dup = cliente.post("/api/escenarios", json={"nombre": NOMBRE, "config": leer_json_base()})
    assert dup.status_code == 409


def test_clonar_no_modifica_original():
    r = cliente.post(f"/api/escenarios/{NOMBRE}/clonar",
                     json={"nuevo": COPIA, "variaciones": {"variacion_costos_pct": 10}})
    assert r.status_code == 201, r.text
    copia = cliente.get(f"/api/escenarios/{COPIA}/config").json()
    copia["agroempresas"][0]["oferta_ton_sem"] = 999
    r = cliente.post("/api/escenarios", json={"nombre": COPIA, "config": copia, "reemplazar": True})
    assert r.json()["parametros_entrada"]["oferta"][0] == 999
    original = cliente.get(f"/api/escenarios/{NOMBRE}").json()
    assert original["parametros_entrada"]["oferta"][0] != 999
