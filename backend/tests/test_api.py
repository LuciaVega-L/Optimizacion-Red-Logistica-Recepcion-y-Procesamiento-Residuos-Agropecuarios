from fastapi.testclient import TestClient

from app.main import app

cliente = TestClient(app)


def _problema_base():
    return cliente.get("/api/red/escenarios/dataConfig/problema").json()


def test_salud():
    assert cliente.get("/api/salud").json() == {"estado": "ok"}


def test_resolver_exacto():
    r = cliente.post("/api/exacto/resolver", json=_problema_base())
    assert r.status_code == 200
    datos = r.json()
    assert round(datos["costo_total"]) == 132_532_000
    assert datos["nodo_ficticio"]["id"] == "E11"
    assert all(f["cumple"] for f in datos["verificacion"])


def test_exacto_con_datos_invalidos():
    problema = _problema_base()
    problema["oferta"][0] = -10
    r = cliente.post("/api/exacto/resolver", json=problema)
    assert r.status_code == 422 and "negativa" in r.json()["detail"]


def test_validar_red():
    datos = cliente.post("/api/red/validar", json=_problema_base()).json()
    assert datos["valido"] and datos["balance"]["estado"] == "oferta_menor"


def test_config_editada_a_problema():
    config = cliente.get("/api/red/escenarios/dataConfig").json()
    config["agroempresas"].append({"id": "E12", "nombre": "Nueva", "municipio": "Cumaral",
                                   "sector": "Palma", "oferta_ton_sem": 50})
    config["matriz_distancias_km"]["E12"] = {"P1": 30, "P2": 12, "P3": 100, "P4": 200}
    problema = cliente.post("/api/red/problema", json=config).json()
    assert problema["fuentes"][-1] == "E12" and len(problema["costos"]) == 11


def test_sensibilidad_simular():
    problema = _problema_base()
    r = cliente.post("/api/sensibilidad/simular", json={
        "problema": problema,
        "escenarios": [{"nombre": "Combustible +10 %", "variacion_costos_pct": 10}],
    })
    assert r.status_code == 200
    datos = r.json()
    assert datos["escenarios"][0]["base_optima_se_mantiene"]
    assert len(datos["rangos"]["capacidad"]) == 4
