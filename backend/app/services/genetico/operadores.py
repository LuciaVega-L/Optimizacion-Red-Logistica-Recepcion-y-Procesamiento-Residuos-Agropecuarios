"""Operadores genéticos: selección (ruleta/torneo), cruce (1 y 2 puntos) y mutación."""

def seleccion_torneo(poblacion, aptitudes, k, rng):
    """Elige k individuos al azar y devuelve una copia del de mayor aptitud."""
    candidatos = rng.sample(range(len(poblacion)), min(k, len(poblacion)))
    ganador = max(candidatos, key=lambda idx: aptitudes[idx])
    return [fila[:] for fila in poblacion[ganador]]


def seleccion_ruleta(poblacion, aptitudes, rng):
    """Selección proporcional a la aptitud; devuelve una copia del individuo."""
    total = sum(aptitudes)
    if total <= 0.0:
        idx = rng.randrange(len(poblacion))
    else:
        punto = rng.uniform(0.0, total)
        acumulado = 0.0
        idx = len(poblacion) - 1
        for i, a in enumerate(aptitudes):
            acumulado += a
            if acumulado >= punto:
                idx = i
                break
    return [fila[:] for fila in poblacion[idx]]


def cruce_un_punto(padre1, padre2, rng):
    """Corta entre empresas en un punto: hijo1 = p1[:c] + p2[c:], hijo2 = p2[:c] + p1[c:]."""
    n = len(padre1)
    if n < 2:
        return [f[:] for f in padre1], [f[:] for f in padre2]
    c = rng.randint(1, n - 1)
    hijo1 = [f[:] for f in padre1[:c]] + [f[:] for f in padre2[c:]]
    hijo2 = [f[:] for f in padre2[:c]] + [f[:] for f in padre1[c:]]
    return hijo1, hijo2


def cruce_dos_puntos(padre1, padre2, rng):
    """Intercambia el tramo de empresas [c1, c2) entre los padres."""
    n = len(padre1)
    if n < 3:
        return cruce_un_punto(padre1, padre2, rng)
    c1, c2 = sorted(rng.sample(range(1, n), 2))
    hijo1 = [f[:] for f in padre1[:c1]] + [f[:] for f in padre2[c1:c2]] + [f[:] for f in padre1[c2:]]
    hijo2 = [f[:] for f in padre2[:c1]] + [f[:] for f in padre1[c1:c2]] + [f[:] for f in padre2[c2:]]
    return hijo1, hijo2


def mutar(individuo, tasa, rng):
    """
    Con probabilidad `tasa` por empresa, traslada una fracción de sus toneladas
    de una planta a otra. Conserva la suma de la fila (la oferta).
    """
    for fila in individuo:
        if rng.random() >= tasa or len(fila) < 2:
            continue
        origenes = [j for j, x in enumerate(fila) if x > 1e-9]
        if not origenes:
            continue
        origen = rng.choice(origenes)
        destino = rng.choice([j for j in range(len(fila)) if j != origen])
        cantidad = rng.uniform(0.05, 0.8) * fila[origen]
        fila[origen] -= cantidad
        fila[destino] += cantidad
    return individuo
