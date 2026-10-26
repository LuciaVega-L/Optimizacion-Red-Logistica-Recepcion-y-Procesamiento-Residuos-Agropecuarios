"""Contratos de entrada de la API (lo que envía el frontend)."""
from pydantic import BaseModel, Field


class ProblemaTransporte(BaseModel):
    fuentes: list[str]
    plantas: list[str]
    oferta: list[float] = Field(..., description="Oferta por fuente (ton)")
    demanda: list[float] = Field(..., description="Capacidad/demanda por planta (ton)")
    costos: list[list[float]] = Field(..., description="Matriz fuentes x plantas ($/ton)")


class ParametrosAG(BaseModel):
    poblacion: int = 100
    generaciones: int = 500
    tasa_cruce: float = 0.8
    tasa_mutacion: float = 0.05
    seleccion: str = "torneo"  # "torneo" | "ruleta"
    tipo_cruce: str = "un_punto"  # "un_punto" | "dos_puntos"
    semilla: int | None = None


class Escenario(BaseModel):
    nombre: str
    variacion_costos_pct: float = 0.0
    variacion_oferta_pct: float = 0.0
    variacion_demanda_pct: float = 0.0
