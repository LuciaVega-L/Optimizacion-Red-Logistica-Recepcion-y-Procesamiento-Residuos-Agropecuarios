from pydantic import BaseModel


class Solucion(BaseModel):
    metodo: str
    costo_total: float
    asignacion: list[list[float]]
    tiempo_s: float
    factible: bool


class VerificacionRestriccion(BaseModel):
    """Una fila de la tabla ✔/✘ de restricciones (HU2)."""
    restriccion: str          
    tipo: str                 
    lado_izquierdo: float
    operador: str             # "=", "≤", "≥"
    lado_derecho: float
    cumple: bool


class NodoFicticio(BaseModel):
    """Nodo agregado para balancear la red (HU2)."""
    tipo: str                 # "fuente" 
    id: str
    cantidad: float           # oferta o capacidad del nodo ficticio 
    flujos: list[float]       # hacia cada planta 


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
    # Rutas no básicas con costo reducido 0
    rutas_optimo_alternativo: list[str] = []
    optimalidad_verificada: bool = False
    verificacion: list[VerificacionRestriccion] = []


class ResultadoGenetico(Solucion):
    historial_fitness: list[float] = []


class ReporteComparativo(BaseModel):
    exacto: ResultadoExacto
    genetico: ResultadoGenetico
    gap_pct: float
