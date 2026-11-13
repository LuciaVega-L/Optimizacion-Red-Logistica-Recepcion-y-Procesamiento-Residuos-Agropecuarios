
from collections import deque

TOL = 1e-6


class UnionFind:
    def __init__(self, nodos):
        self.padre = {x: x for x in nodos}

    def raiz(self, x):
        while self.padre[x] != x:
            self.padre[x] = self.padre[self.padre[x]]
            x = self.padre[x]
        return x

    def unir(self, a, b) -> bool:
        ra, rb = self.raiz(a), self.raiz(b)
        if ra == rb:
            return False
        self.padre[ra] = rb
        return True


def construir_base(X, costos, u0=None, v0=None, tol: float = TOL, prohibidas=()) -> list[tuple[int, int]]:
  
    n, m = len(X), len(X[0])
    uf = UnionFind([("r", i) for i in range(n)] + [("c", j) for j in range(m)])
    base = []
    positivas = sorted(((i, j) for i in range(n) for j in range(m) if X[i][j] > tol),
                       key=lambda c: -X[c[0]][c[1]])
    for i, j in positivas:
        if uf.unir(("r", i), ("c", j)):
            base.append((i, j))

    def costo_reducido(i, j):
        if u0 is None or v0 is None:
            return 0.0
        return abs(costos[i][j] - u0[i] - v0[j])

    # Una ruta deshabilitada nunca completa la base: no puede llevar flujo
    candidatas = sorted(((i, j) for i in range(n) for j in range(m)
                         if (i, j) not in set(base) and (i, j) not in prohibidas),
                        key=lambda c: (costo_reducido(*c), costos[c[0]][c[1]]))
    for i, j in candidatas:
        if len(base) == n + m - 1:
            break
        if uf.unir(("r", i), ("c", j)):
            base.append((i, j))
    return base


def duales_desde_base(base, costos, n, m, fijo=("r", 0)):
    ady = adyacencia(base)
    valor = {fijo: 0.0}
    cola = deque([fijo])
    while cola:
        nodo = cola.popleft()
        for vecino, (i, j) in ady.get(nodo, []):
            if vecino not in valor:
                valor[vecino] = costos[i][j] - valor[nodo]
                cola.append(vecino)
    u = [valor.get(("r", i), 0.0) for i in range(n)]
    v = [valor.get(("c", j), 0.0) for j in range(m)]
    return u, v


def adyacencia(base):
    ady = {}
    for i, j in base:
        ady.setdefault(("r", i), []).append((("c", j), (i, j)))
        ady.setdefault(("c", j), []).append((("r", i), (i, j)))
    return ady


def componente_sin_celda(base, celda, inicio):
    ady = adyacencia([c for c in base if c != celda])
    vistos, cola = {inicio}, deque([inicio])
    while cola:
        nodo = cola.popleft()
        for vecino, _ in ady.get(nodo, []):
            if vecino not in vistos:
                vistos.add(vecino)
                cola.append(vecino)
    return vistos


def camino(base, origen, destino):

    ady = adyacencia(base)
    previo = {origen: None}
    cola = deque([origen])
    while cola:
        nodo = cola.popleft()
        if nodo == destino:
            break
        for vecino, celda in ady.get(nodo, []):
            if vecino not in previo:
                previo[vecino] = (nodo, celda)
                cola.append(vecino)
    if destino not in previo:
        return None
    pasos, nodo = [], destino
    while previo[nodo] is not None:
        anterior, celda = previo[nodo]
        signo = +1 if anterior[0] == "r" else -1   # fila→columna: +δ ; columna→fila: −δ
        pasos.append((celda, signo))
        nodo = anterior
    return list(reversed(pasos))


def flujos_desde_base(base, oferta, demanda):

    restante = {("r", i): float(o) for i, o in enumerate(oferta)}
    restante.update({("c", j): float(d) for j, d in enumerate(demanda)})
    ady = {nodo: set() for nodo in restante}
    for i, j in base:
        ady[("r", i)].add((i, j))
        ady[("c", j)].add((i, j))
    flujos = {}
    hojas = deque(nodo for nodo, celdas in ady.items() if len(celdas) == 1)
    while hojas:
        nodo = hojas.popleft()
        if len(ady[nodo]) != 1:
            continue
        celda = ady[nodo].pop()
        otro = ("c", celda[1]) if nodo[0] == "r" else ("r", celda[0])
        flujos[celda] = restante[nodo]
        restante[otro] -= restante[nodo]
        ady[otro].discard(celda)
        if len(ady[otro]) == 1:
            hojas.append(otro)
    return flujos
