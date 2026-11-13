"""Rutas deshabilitadas (exacto, AG, sensibilidad, validación) y penalizaciones del AG."""
import pytest
from fastapi.testclient import TestClient

from app.schemas.red import ParametrosAG
from app.services.exacto import solver
from app.services.exacto.solver import ProblemaInvalido
from app.services.genetico import algoritmo
from app.services.red import repositorio
from app.services.red.validacion import validar
from app.services.sensibilidad import analisis


def _cerrar(problema, *rutas):
    return problema.model_copy(update={"rutas_deshabilitadas": list(rutas)})


def test_exacto_no_usa_rutas_cerradas(problema_pequeno):
    # Sin cerrar, C envía todo a P2 (costo 2). Cerrando C→P2, debe ir a P1.
    base = solver.resolver(problema_pequeno)
    assert base.asignacion[2][1] > 0
    res = solver.resolver(_cerrar(problema_pequeno, ("C", "P2")))
    assert res.asignacion[2][1] == 0
    assert res.costo_total >= base.costo_total
    assert res.optimalidad_verificada
    assert "C→P2" not in res.variables_basicas
    assert "C→P2" not in res.rutas_optimo_alternativo


def test_exacto_infactible_con_rutas_cerradas_responde_claro(problema_pequeno):
    # P2 (35 t) solo puede recibir de A (20 t): no hay forma de llenarla
    p = _cerrar(problema_pequeno, ("B", "P2"), ("C", "P2"))
    with pytest.raises(ProblemaInvalido, match="No existe una asignación factible"):
        solver.resolver(p)


def test_validar_rutas_cerradas(problema_pequeno):
    todas = _cerrar(problema_pequeno, ("A", "P1"), ("A", "P2"))
    assert any("A tiene todas sus rutas deshabilitadas" in e for e in validar(todas))
    desconocida = _cerrar(problema_pequeno, ("Z", "P1"))
    assert any("no existen" in e for e in validar(desconocida))


def test_ag_respeta_rutas_cerradas(problema_pequeno):
    p = _cerrar(problema_pequeno, ("C", "P2"), ("A", "P1"))
    res = algoritmo.ejecutar(p, ParametrosAG(poblacion=30, generaciones=40, semilla=1))
    assert res.factible
    assert res.asignacion[2][1] == 0 and res.asignacion[0][0] == 0


def test_sensibilidad_omite_rutas_cerradas(problema_pequeno):
    p = _cerrar(problema_pequeno, ("C", "P2"))
    rutas = {f["ruta"] for f in analisis.rangos(p)["costos"]}
    assert "C→P2" not in rutas and "C→P1" in rutas


def test_caso_base_con_rutas_cerradas():
    cfg = repositorio.cargar_escenario()
    cfg["rutas_deshabilitadas"] = [["E01", "P2"], ["E10", "P3"]]
    res = solver.resolver(repositorio.a_problema(cfg))
    assert res.asignacion[0][1] == 0 and res.asignacion[9][2] == 0
    assert res.optimalidad_verificada and res.factible


def test_penalizaciones_llegan_al_ag(problema_pequeno):
    cfg = {"parametros_globales": {"costo_transporte_km_ton": 1}, "agroempresas": [{"id": "E1", "oferta_ton_sem": 5}],
           "plantas": [{"id": "P1", "capacidad_maxima_ton_sem": 5, "costo_operativo_ton": 0}],
           "matriz_distancias_km": {"E1": {"P1": 3}}, "penalizaciones": {"factorPlanta": 7, "factorDemanda": 9}}
    p = repositorio.a_problema(cfg)
    assert (p.penalizacion_oferta, p.penalizacion_capacidad) == (7, 9)
    datos = algoritmo._datos_desde_problema(p)
    assert datos["penalizaciones"] == {"factorPlanta": 7.0, "factorDemanda": 9.0}
    # Sin penalizaciones en los datos, el AG usa su valor por defecto
    assert algoritmo._datos_desde_problema(problema_pequeno)["penalizaciones"] == {}


def test_api_genetico_valida_datos(problema_pequeno):
    from main import app
    cuerpo = {"problema": _cerrar(problema_pequeno, ("A", "P1"), ("A", "P2")).model_dump(), "parametros": {}}
    r = TestClient(app).post("/genetico/resolver", json=cuerpo)
    assert r.status_code == 422
    assert "A tiene todas sus rutas deshabilitadas" in r.json()["detail"]
