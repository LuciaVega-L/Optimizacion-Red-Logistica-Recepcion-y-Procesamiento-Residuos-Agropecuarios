"""CORS: el frontend en localhost (cualquier puerto) puede leer la API; un sitio externo no."""
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from main import app

cliente = TestClient(app)


def _preflight(origen: str):
    return cliente.options("/salud", headers={"Origin": origen, "Access-Control-Request-Method": "GET"})


@pytest.mark.parametrize("origen", ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:3000"])
def test_acepta_localhost_en_cualquier_puerto(origen):
    r = _preflight(origen)
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == origen


def test_rechaza_un_sitio_externo():
    r = _preflight("https://sitio-externo.com")
    assert "access-control-allow-origin" not in r.headers


def test_lista_de_origenes_desde_la_configuracion():
    s = Settings(_env_file=None, cors_origenes=" https://ecoresiduos.app/ , ,http://localhost:5173",
                 cors_localhost=False)
    assert s.cors_origenes_lista == ["https://ecoresiduos.app", "http://localhost:5173"]
    assert s.cors_regex is None
