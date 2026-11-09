"""Aplica variaciones porcentuales de costos, oferta y capacidad a un problema base.

El problema original nunca se modifica (HU4): siempre se devuelve una copia.
"""
from app.schemas.red import Escenario, ProblemaTransporte


def _escalar(valores, ids, factor, objetivo):
    if objetivo is not None and objetivo not in ids:
        raise ValueError(f"'{objetivo}' no existe en la red.")
    return [v * factor if objetivo in (None, ids[k]) else v for k, v in enumerate(valores)]


def aplicar(problema: ProblemaTransporte, escenario: Escenario) -> ProblemaTransporte:
    f_c = 1 + escenario.variacion_costos_pct / 100
    f_o = 1 + escenario.variacion_oferta_pct / 100
    f_d = 1 + escenario.variacion_demanda_pct / 100

    cambios = {
        "oferta": _escalar(problema.oferta, problema.fuentes, f_o, escenario.oferta_objetivo),
        "demanda": _escalar(problema.demanda, problema.plantas, f_d, escenario.demanda_objetivo),
    }
    tiene_origen = (problema.distancias is not None and problema.costo_km_ton is not None
                    and problema.costo_operativo is not None)
    if tiene_origen:
        # Solo cambia el transporte (combustible); el costo operativo de la planta se mantiene.
        costo_km = problema.costo_km_ton * f_c
        cambios["costo_km_ton"] = costo_km
        cambios["costos"] = [[d * costo_km + problema.costo_operativo[j] for j, d in enumerate(fila)]
                             for fila in problema.distancias]
    else:
        cambios["costos"] = [[c * f_c for c in fila] for fila in problema.costos]
    return problema.model_copy(update=cambios, deep=True)
