"""Lectura de escenarios en backend/data/escenarios/ y conversión al problema de transporte.

El archivo de datos (p. ej. dataConfig.json) guarda solo datos de origen:
distancias, costo por km·ton y costo operativo de cada planta.
La matriz de costos unitarios se calcula aquí, nunca se guarda en el JSON:

    c_ij = distancia_ij * costo_transporte_km_ton + costo_operativo_j     [COP/ton]
"""
import json
from pathlib import Path

from app.schemas.red import ProblemaTransporte
from app.core.config import settings

DIR_ESCENARIOS = Path(__file__).resolve().parents[3] / "data" / "escenarios"
ESCENARIO_BASE = "dataConfig"


def listar_escenarios() -> list[str]:
    if settings.usa_bd:
        from app.services.red import repositorio_bd
        return repositorio_bd.listar_escenarios()
    return sorted(p.stem for p in DIR_ESCENARIOS.glob("*.json"))


def cargar_escenario(nombre: str = ESCENARIO_BASE) -> dict:
    """Devuelve el escenario con el formato de dataConfig.json.

    Con FUENTE_DATOS=bd lo lee de PostgreSQL (mismas claves);
    si no, lo lee del archivo en disco.
    """
    if settings.usa_bd:
        from app.services.red import repositorio_bd
        return repositorio_bd.cargar_escenario(nombre)
    with open(DIR_ESCENARIOS / f"{nombre}.json", encoding="utf-8") as f:
        return json.load(f)


def calcular_costos(config: dict, incluir_costo_operativo: bool = True) -> list[list[float]]:
    """Matriz agroempresas x plantas de costo unitario (COP/ton)."""
    costo_km_ton = config["parametros_globales"]["costo_transporte_km_ton"]
    distancias = config["matriz_distancias_km"]
    matriz = []
    for empresa in config["agroempresas"]:
        fila = []
        for planta in config["plantas"]:
            costo = distancias[empresa["id"]][planta["id"]] * costo_km_ton
            if incluir_costo_operativo:
                costo += planta["costo_operativo_ton"]
            fila.append(costo)
        matriz.append(fila)
    return matriz


def a_problema(config: dict, incluir_costo_operativo: bool = True) -> ProblemaTransporte:
    """Convierte el dataConfig al formato que reciben los solucionadores."""
    return ProblemaTransporte(
        fuentes=[e["id"] for e in config["agroempresas"]],
        plantas=[p["id"] for p in config["plantas"]],
        oferta=[e["oferta_ton_sem"] for e in config["agroempresas"]],
        demanda=[p["capacidad_maxima_ton_sem"] for p in config["plantas"]],
        costos=calcular_costos(config, incluir_costo_operativo),
    )
