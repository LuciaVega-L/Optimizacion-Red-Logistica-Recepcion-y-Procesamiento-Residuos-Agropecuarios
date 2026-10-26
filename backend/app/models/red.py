"""Entidades del dominio: la red logística como grafo dirigido G = (V, E)."""
from dataclasses import dataclass, field


@dataclass
class Nodo:
    id: str
    nombre: str
    tipo: str  # "fuente" | "planta" | "paso"
    capacidad: float = 0.0  # oferta (fuente) o capacidad/demanda (planta)


@dataclass
class Arco:
    origen: str
    destino: str
    distancia_km: float
    costo_km_ton: float

    @property
    def costo_unitario(self) -> float:
        return self.distancia_km * self.costo_km_ton


@dataclass
class Red:
    nodos: list[Nodo] = field(default_factory=list)
    arcos: list[Arco] = field(default_factory=list)

    @property
    def fuentes(self) -> list[Nodo]:
        return [n for n in self.nodos if n.tipo == "fuente"]

    @property
    def plantas(self) -> list[Nodo]:
        return [n for n in self.nodos if n.tipo == "planta"]
