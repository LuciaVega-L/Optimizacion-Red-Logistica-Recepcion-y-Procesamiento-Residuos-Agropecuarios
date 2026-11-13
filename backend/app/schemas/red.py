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

    # Rutas cerradas (vía en mal estado, sin convenio...): pares [agroempresa, planta].
    # Ningún método puede enviar flujo por ellas. Mismo formato que dataConfig.json y la BD.
    rutas_deshabilitadas: list[tuple[str, str]] = Field(default_factory=list,
                                                       description="Pares [fuente, planta] cerrados")

    # Penalizaciones del AG (λ por tonelada² de exceso). None = el AG usa su valor por defecto.
    # Vienen de "penalizaciones" en dataConfig.json (factorPlanta = oferta, factorDemanda = capacidad).
    penalizacion_oferta: float | None = Field(None, description="λ de exceso de oferta (AG)")
    penalizacion_capacidad: float | None = Field(None, description="λ de exceso de capacidad (AG)")

    def indices_deshabilitados(self) -> set[tuple[int, int]]:
        """Pares (i, j) de rutas cerradas, en el orden de fuentes y plantas."""
        fi = {f: i for i, f in enumerate(self.fuentes)}
        pj = {p: j for j, p in enumerate(self.plantas)}
        return {(fi[f], pj[p]) for f, p in self.rutas_deshabilitadas if f in fi and p in pj}


class ParametrosAG(BaseModel):
    poblacion: int = Field(default=100, ge=2)
    generaciones: int = Field(default=500, ge=1)
    tasa_cruce: float = Field(default=0.8, ge=0, le=1)
    tasa_mutacion: float = Field(default=0.05, ge=0, le=1)
    seleccion: str = "torneo"
    tipo_cruce: str = "un_punto"
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
