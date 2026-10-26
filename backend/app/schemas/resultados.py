"""Contratos de salida de la API (lo que recibe el frontend)."""
from pydantic import BaseModel


class Solucion(BaseModel):
    metodo: str
    costo_total: float
    asignacion: list[list[float]]
    tiempo_s: float
    factible: bool


class ResultadoExacto(Solucion):
    precios_sombra_oferta: list[float] = []
    precios_sombra_demanda: list[float] = []


class ResultadoGenetico(Solucion):
    historial_fitness: list[float] = []


class ReporteComparativo(BaseModel):
    exacto: ResultadoExacto
    genetico: ResultadoGenetico
    gap_pct: float
