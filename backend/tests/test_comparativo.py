from app.services.comparativo.metricas import gap_porcentual


def test_gap():
    assert gap_porcentual(110, 100) == 10
