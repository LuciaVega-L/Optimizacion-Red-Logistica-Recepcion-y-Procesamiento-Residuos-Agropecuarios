"""Generador de redes sintéticas para el análisis de escalabilidad (HU5).

Produce un diccionario con el mismo formato de dataConfig.json, así que pasa por el mismo
`repositorio.a_problema` que el caso real. Los nodos se ubican al azar en un rectángulo de
300 × 200 km (aprox. la zona agroindustrial del Meta) y la distancia vial se estima como
la distancia euclidiana × 1,25 (factor de sinuosidad de las vías).
"""
import math
import random

FACTOR_SINUOSIDAD = 1.25


def generar_red(n_fuentes: int, n_plantas: int, semilla: int = 42,
                holgura_capacidad: float = 0.10, costo_km_ton: float = 1200) -> dict:
    if n_fuentes < 1 or n_plantas < 1:
        raise ValueError("Debe haber al menos una agroempresa y una planta.")
    rng = random.Random(semilla)
    ancho_e = len(str(n_fuentes))
    ancho_p = len(str(n_plantas))

    agroempresas = [{
        "id": f"E{k + 1:0{max(2, ancho_e)}d}", "nombre": f"Agroempresa sintética {k + 1}",
        "municipio": "Sintético", "sector": rng.choice(["Palma", "Arroz", "Ganadería", "Forestal"]),
        "oferta_ton_sem": rng.randint(50, 250),
        "_xy": (rng.uniform(0, 300), rng.uniform(0, 200)),
    } for k in range(n_fuentes)]

    oferta_total = sum(e["oferta_ton_sem"] for e in agroempresas)
    pesos = [rng.uniform(0.7, 1.3) for _ in range(n_plantas)]
    capacidad_total = oferta_total * (1 + holgura_capacidad)
    plantas = [{
        "id": f"P{k + 1:0{ancho_p}d}" if ancho_p > 1 else f"P{k + 1}",
        "nombre": f"Planta sintética {k + 1}", "municipio": "Sintético",
        "capacidad_maxima_ton_sem": math.ceil(capacidad_total * w / sum(pesos)),
        "costo_operativo_ton": rng.randrange(20000, 26000, 500),
        "_xy": (rng.uniform(0, 300), rng.uniform(0, 200)),
    } for k, w in enumerate(pesos)]

    distancias = {
        e["id"]: {p["id"]: round(math.dist(e["_xy"], p["_xy"]) * FACTOR_SINUOSIDAD + 3)
                  for p in plantas}
        for e in agroempresas
    }
    for nodo in agroempresas + plantas:
        nodo.pop("_xy")

    return {
        "_meta": {"descripcion": f"Red sintética {n_fuentes}x{n_plantas} (semilla {semilla})"},
        "parametros_globales": {"costo_transporte_km_ton": costo_km_ton},
        "plantas": plantas,
        "agroempresas": agroempresas,
        "matriz_distancias_km": distancias,
    }
