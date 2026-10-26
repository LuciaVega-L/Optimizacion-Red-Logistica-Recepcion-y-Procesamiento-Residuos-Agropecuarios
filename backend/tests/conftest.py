import pytest

from app.schemas.red import ProblemaTransporte


@pytest.fixture
def problema_pequeno():
    """Problema 3x2 balanceado para pruebas rápidas."""
    return ProblemaTransporte(
        fuentes=["A", "B", "C"],
        plantas=["P1", "P2"],
        oferta=[20, 30, 25],
        demanda=[40, 35],
        costos=[[4, 6], [5, 3], [7, 2]],
    )
