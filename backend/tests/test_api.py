from fastapi.testclient import TestClient

from app.main import app

cliente = TestClient(app)


def test_salud():
    assert cliente.get("/api/salud").json() == {"estado": "ok"}
