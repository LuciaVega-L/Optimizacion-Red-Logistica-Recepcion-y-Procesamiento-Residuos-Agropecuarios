"""Contratos de entrada de la API (lo que envía el frontend)."""
from pydantic import BaseModel, Field


class ProblemaTransporte(BaseModel):
    fuentes: list[str]
    plantas: list[str]
    oferta: list[float] = Field(..., description="Oferta por fuente (ton/sem)")
    demanda: list[float] = Field(..., description="Capacidad máxima por planta (ton/sem)")
    costos: list[list[float]] = Field(..., description="Matriz fuentes x plantas (COP/ton)")

    # Datos de origen (opcionales). Si vienen, el análisis de sensibilidad puede
    # variar solo el componente de transporte (combustible) sin tocar el costo operativo:
    #   c_ij = distancias_ij * costo_km_ton + costo_operativo_j
    distancias: list[list[float]] | None = Field(None, description="Matriz fuentes x plantas (km)")
    costo_km_ton: float | None = Field(None, description="COP / (km·ton)")
    costo_operativo: list[float] | None = Field(None, description="COP / ton por planta")


class ParametrosAG(BaseModel):
    poblacion: int = 100
    generaciones: int = 500
    tasa_cruce: float = 0.8
    tasa_mutacion: float = 0.05
    seleccion: str = "torneo"  # "torneo" | "ruleta"
    tipo_cruce: str = "un_punto"  # "un_punto" | "dos_puntos"
    semilla: int | None = None


class Escenario(BaseModel):
    """Variación porcentual sobre el caso base.

    - variacion_costos_pct: cambia el costo de transporte (combustible). Si el problema trae
      distancias y costo_km_ton, solo se escala el componente de transporte; si no, toda la matriz.
    - variacion_oferta_pct / oferta_objetivo: None = todas las agroempresas; un id = solo esa.
    - variacion_demanda_pct / demanda_objetivo: None = todas las plantas; un id = solo esa
      (p. ej. -30 % en una planta simula un cuello de botella).
    """
    nombre: str
    variacion_costos_pct: float = 0.0
    variacion_oferta_pct: float = 0.0
    oferta_objetivo: str | None = None
    variacion_demanda_pct: float = 0.0
    demanda_objetivo: str | None = None


class SolicitudSensibilidad(BaseModel):
    problema: ProblemaTransporte
    escenarios: list[Escenario]
    incluir_ag: bool = False
    parametros_ag: ParametrosAG | None = None
