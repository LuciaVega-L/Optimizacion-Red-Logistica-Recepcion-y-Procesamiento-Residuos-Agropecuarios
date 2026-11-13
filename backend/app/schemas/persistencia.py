from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ------------------------------------------------------------------ escenarios
class EscenarioGuardar(BaseModel):
    nombre: str = Field(..., min_length=1, examples=["Costos +10%"])
    config: dict[str, Any] = Field(
        ..., description="Red con el formato de dataConfig.json: parametros_globales, "
                         "agroempresas, plantas y matriz_distancias_km")
    descripcion: str | None = None
    reemplazar: bool = Field(False, description="Sobrescribe si ya existe un escenario con ese nombre")


class EscenarioClonar(BaseModel):
    nuevo: str = Field(..., min_length=1)
    variaciones: dict[str, Any] = Field(default_factory=dict,
                                        examples=[{"variacion_costos_pct": 10}])
    descripcion: str | None = None


class EscenarioSalida(BaseModel):
    id: str
    nombre: str
    fecha: datetime
    descripcion: str | None = None
    es_base: bool
    costo_transporte_km_ton: float
    escenario_origen_id: str | None = None
    variaciones: dict[str, Any] = {}
    parametros_entrada: dict[str, Any] = Field(
        default_factory=dict, description="fuentes, plantas, oferta, demanda, costos (cᵢⱼ), distancias_km...")
    actualizado_en: datetime


class EscenarioResumen(BaseModel):
    id: str
    nombre: str
    fecha: datetime
    descripcion: str | None = None
    es_base: bool
    num_agroempresas: int
    num_plantas: int
    num_rutas_habilitadas: int
    oferta_total: float
    capacidad_total: float
    holgura_capacidad: float
    estado_balance: str
    num_resultados: int
    fecha_ultimo_resultado: datetime | None = None
    escenario_origen_id: str | None = None
    variaciones: dict[str, Any] = {}


# resultados
class ResultadoGuardar(BaseModel):
    escenario: str = Field(..., description="Nombre del escenario resuelto", examples=["dataConfig"])
    algoritmo_utilizado: str = Field(..., examples=["Exacto", "Genético"])
    costo_total: float = Field(..., ge=0)
    tiempo_ejecucion_ms: float = Field(..., ge=0)
    matriz_flujos: list[list[float]] = Field(
        ..., description="xᵢⱼ (t/semana): filas = agroempresas, columnas = plantas, en el orden del escenario")
    factible: bool | None = None
    parametros_algoritmo: dict[str, Any] = Field(default_factory=dict)
    historial_fitness: list[float] | None = None
    costo_transporte: float | None = None
    costo_operativo: float | None = None
    precios_sombra_oferta: list[float] | None = None
    precios_sombra_demanda: list[float] | None = None
    rangos_oferta: list[list[float | None]] | None = None
    rangos_demanda: list[list[float | None]] | None = None

    @field_validator("algoritmo_utilizado")
    @classmethod
    def normalizar_algoritmo(cls, v: str) -> str:
        a = v.strip().lower()
        if a in {"exacto", "exact", "pl", "lp", "simplex"}:
            return "Exacto"
        if a in {"genético", "genetico", "ag", "ga", "algoritmo genético", "algoritmo genetico"}:
            return "Genético"
        raise ValueError('algoritmo_utilizado debe ser "Exacto" o "Genético"')


class PrecioSombraSalida(BaseModel):
    tipo: str
    nodo_codigo: str
    valor_dual: float
    holgura: float | None = None
    rango_inferior: float | None = None
    rango_superior: float | None = None


class ResultadoSalida(BaseModel):
    id: str
    escenario_id: str
    escenario: str | None = None
    algoritmo_utilizado: str
    costo_total: float
    tiempo_ejecucion_ms: float
    gap_desviacion: float | None = Field(None, description="% respecto al último resultado Exacto del escenario")
    matriz_flujos_json: dict[str, Any] | None = Field(
        None, description='{"agroempresas": [...], "plantas": [...], "toneladas": [[...]]}')
    costo_transporte: float | None = None
    costo_operativo: float | None = None
    factible: bool | None = None
    parametros_algoritmo: dict[str, Any] = {}
    resultado_exacto_id: str | None = None
    fecha: datetime
    historial_fitness: list[float] | None = None
    precios_sombra: list[PrecioSombraSalida] | None = None


class ComparativoFila(BaseModel):
    escenario_id: str
    escenario: str
    fecha_escenario: datetime
    resultado_exacto_id: str | None = None
    resultado_genetico_id: str | None = None
    costo_exacto: float | None = None
    costo_genetico: float | None = None
    gap_desviacion: float | None = None
    tiempo_exacto_ms: float | None = None
    tiempo_genetico_ms: float | None = None
    genetico_factible: bool | None = None
    parametros_ag: dict[str, Any] | None = None
    fecha_ultimo_resultado: datetime | None = None
