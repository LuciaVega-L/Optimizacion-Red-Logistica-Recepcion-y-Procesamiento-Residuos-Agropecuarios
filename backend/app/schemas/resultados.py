"""Contratos de salida de la API (lo que recibe el frontend)."""
from pydantic import BaseModel


class Solucion(BaseModel):
    metodo: str
    costo_total: float
    asignacion: list[list[float]]
    tiempo_s: float
    factible: bool


class VerificacionRestriccion(BaseModel):
    """Una fila de la tabla ✔/✘ de restricciones (HU2)."""
    restriccion: str          # p. ej. "Oferta E01", "Capacidad P3", "No negatividad"
    tipo: str                 # "oferta" | "capacidad" | "no_negatividad"
    lado_izquierdo: float
    operador: str             # "=", "≤", "≥"
    lado_derecho: float
    cumple: bool


class NodoFicticio(BaseModel):
    """Nodo agregado para balancear la red (HU2)."""
    tipo: str                 # "fuente" (sobra capacidad) | "planta" (falta capacidad)
    id: str
    cantidad: float           # oferta o capacidad del nodo ficticio (t/sem)
    flujos: list[float]       # hacia cada planta (si es fuente) o desde cada fuente (si es planta)


class ResultadoExacto(Solucion):
    estado: str = "Optimal"
    fuentes: list[str] = []
    plantas: list[str] = []
    precios_sombra_oferta: list[float] = []
    precios_sombra_demanda: list[float] = []
    costos_reducidos: list[list[float]] = []
    holgura_plantas: list[float] = []
    nodo_ficticio: NodoFicticio | None = None
    variables_basicas: list[str] = []
    degenerada: bool = False
    # Rutas no básicas con costo reducido 0: existen otras asignaciones con el mismo Z*.
    rutas_optimo_alternativo: list[str] = []
    optimalidad_verificada: bool = False
    verificacion: list[VerificacionRestriccion] = []


class ResultadoGenetico(Solucion):
    historial_fitness: list[float] = []


class ReporteComparativo(BaseModel):
    exacto: ResultadoExacto
    genetico: ResultadoGenetico
    gap_pct: float
