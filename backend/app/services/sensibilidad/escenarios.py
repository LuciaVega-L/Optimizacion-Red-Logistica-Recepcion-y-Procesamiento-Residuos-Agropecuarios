"""Aplica variaciones porcentuales de costos, oferta y demanda a un problema base."""
from app.schemas.red import Escenario, ProblemaTransporte


def aplicar(problema: ProblemaTransporte, escenario: Escenario) -> ProblemaTransporte:
    f_c = 1 + escenario.variacion_costos_pct / 100
    f_o = 1 + escenario.variacion_oferta_pct / 100
    f_d = 1 + escenario.variacion_demanda_pct / 100
    return problema.model_copy(update={
        "costos": [[c * f_c for c in fila] for fila in problema.costos],
        "oferta": [o * f_o for o in problema.oferta],
        "demanda": [d * f_d for d in problema.demanda],
    })
