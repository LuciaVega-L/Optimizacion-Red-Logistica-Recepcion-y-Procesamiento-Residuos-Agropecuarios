"""Construcción del modelo PL (conjuntos, variables, FO y restricciones) con PuLP.

El modelo se construye siempre en su forma **balanceada** (HU2):

* Oferta < capacidad → se agrega una agroempresa ficticia
* Oferta > capacidad → se agrega una planta ficticia con capacidad igual al faltante. 
* Oferta = capacidad → no se agrega nada.

Forma balanceada (todas las restricciones con igualdad):

    min  Z = Σ_i Σ_j c_ij x_ij
    s.a. Σ_j x_ij = O_i     ∀ i ∈ I'
         Σ_i x_ij = D_j     ∀ j ∈ J'
         x_ij ≥ 0

Tiene el mismo óptimo que el modelo original con capacidades "≤" (sección II-E del informe).
"""
import re
from dataclasses import dataclass, field

import pulp

from app.schemas.red import ProblemaTransporte

TOL = 1e-6


@dataclass
class ProblemaBalanceado:
    fuentes: list[str]
    plantas: list[str]
    oferta: list[float]
    demanda: list[float]
    costos: list[list[float]]
    n_real: int                    # número de fuentes reales
    m_real: int                    # número de plantas reales
    ficticio: dict | None = None   # {"tipo": "fuente"|"planta", "id": str, "cantidad": float}
    cerradas: set = field(default_factory=set)   # (i, j) de rutas deshabilitadas: x_ij = 0

    @property
    def indice_ficticio(self) -> tuple[str, int] | None:
        """("r", i) si la ficticia es una fila (fuente); ("c", j) si es una columna (planta)."""
        if self.ficticio is None:
            return None
        if self.ficticio["tipo"] == "fuente":
            return ("r", len(self.fuentes) - 1)
        return ("c", len(self.plantas) - 1)


@dataclass
class ModeloTransporte:
    lp: pulp.LpProblem
    x: dict = field(default_factory=dict)            # (i, j) -> LpVariable
    r_oferta: list = field(default_factory=list)     # restricciones de oferta
    r_demanda: list = field(default_factory=list)    # restricciones de capacidad
    balanceado: ProblemaBalanceado | None = None


def siguiente_id(ids: list[str], respaldo: str) -> str:
    partes = [re.fullmatch(r"([A-Za-z_]*)(\d+)", x) for x in ids]
    if ids and all(partes) and len({p.group(1) for p in partes}) == 1:
        prefijo = partes[0].group(1)
        ancho = max(len(p.group(2)) for p in partes)
        nuevo = f"{prefijo}{max(int(p.group(2)) for p in partes) + 1:0{ancho}d}"
        if nuevo not in ids:
            return nuevo
    candidato, k = respaldo, 2
    while candidato in ids:
        candidato, k = f"{respaldo}{k}", k + 1
    return candidato


def balancear(problema: ProblemaTransporte, costo_no_procesado: float = 0.0) -> ProblemaBalanceado:
    fuentes, plantas = list(problema.fuentes), list(problema.plantas)
    oferta, demanda = list(problema.oferta), list(problema.demanda)
    costos = [list(f) for f in problema.costos]
    n, m = len(fuentes), len(plantas)
    diferencia = sum(demanda) - sum(oferta)
    ficticio = None

    if diferencia > TOL:          # sobra capacidad → agroempresa ficticia
        id_f = siguiente_id(fuentes, "E_FICTICIA")
        fuentes.append(id_f)
        oferta.append(diferencia)
        costos.append([0.0] * m)
        ficticio = {"tipo": "fuente", "id": id_f, "cantidad": diferencia}
    elif diferencia < -TOL:       # falta capacidad → planta ficticia
        id_f = siguiente_id(plantas, "P_FICTICIA")
        plantas.append(id_f)
        demanda.append(-diferencia)
        for fila in costos:
            fila.append(float(costo_no_procesado))
        ficticio = {"tipo": "planta", "id": id_f, "cantidad": -diferencia}

    # Los índices reales no cambian: la fila o columna ficticia va al final y nunca está cerrada.
    return ProblemaBalanceado(fuentes, plantas, oferta, demanda, costos, n, m, ficticio,
                              problema.indices_deshabilitados())


def construir_modelo(problema: ProblemaTransporte, costo_no_procesado: float = 0.0) -> ModeloTransporte:
    """Crea el LpProblem con variables x_ij, función objetivo y restricciones."""
    b = balancear(problema, costo_no_procesado)
    lp = pulp.LpProblem("Transporte_EcoResiduos", pulp.LpMinimize)
    I, J = range(len(b.fuentes)), range(len(b.plantas))

    # Ruta deshabilitada → cota superior 0 (la variable existe pero no puede llevar flujo)
    x = {(i, j): pulp.LpVariable(f"x_{i}_{j}", lowBound=0, upBound=0 if (i, j) in b.cerradas else None)
         for i in I for j in J}
    lp += pulp.lpSum(b.costos[i][j] * x[i, j] for i in I for j in J), "Costo_total"

    r_oferta, r_demanda = [], []
    for i in I:
        nombre = f"Oferta_{i}"
        lp += pulp.lpSum(x[i, j] for j in J) == b.oferta[i], nombre
        r_oferta.append(nombre)
    for j in J:
        nombre = f"Capacidad_{j}"
        lp += pulp.lpSum(x[i, j] for i in I) == b.demanda[j], nombre
        r_demanda.append(nombre)

    return ModeloTransporte(lp=lp, x=x, r_oferta=r_oferta, r_demanda=r_demanda, balanceado=b)
