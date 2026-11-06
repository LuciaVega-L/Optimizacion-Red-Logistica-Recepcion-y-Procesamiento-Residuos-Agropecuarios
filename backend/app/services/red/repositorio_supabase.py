"""Persistencia de escenarios y resultados en Supabase.

Los escenarios se leen y escriben con el MISMO formato de dataConfig.json:
    {parametros_globales, penalizaciones, plantas, agroempresas, matriz_distancias_km}
asi que repositorio.a_problema() y genetico.fitness.EvaluadorFitness
funcionan igual con datos de archivo o de base de datos.

La logica pesada vive en funciones SQL (supabase/migrations/..._funciones.sql),
que se ejecutan en una sola transaccion.
"""
from typing import Any

from pydantic import BaseModel

from app.db.supabase_cliente import ejecutar, obtener_cliente


# ------------------------------------------------------------------ escenarios
def listar_escenarios() -> list[str]:
    filas = ejecutar(obtener_cliente().table("escenarios").select("nombre").order("nombre"))
    return [f["nombre"] for f in filas]


def resumen_escenarios() -> list[dict]:
    """Tamaño de la red, oferta/capacidad total y estado de balance de cada escenario."""
    return ejecutar(obtener_cliente().table("v_resumen_escenarios").select("*").order("nombre"))


def cargar_escenario(nombre: str) -> dict:
    """Escenario completo con el formato de dataConfig.json."""
    return ejecutar(obtener_cliente().rpc("obtener_config_escenario", {"p_nombre": nombre}))


def guardar_escenario(
    nombre: str,
    config: dict,
    descripcion: str | None = None,
    es_base: bool = False,
    reemplazar: bool = False,
) -> str:
    """Crea (o con reemplazar=True sobrescribe) un escenario. Devuelve su id."""
    return ejecutar(obtener_cliente().rpc("guardar_config_escenario", {
        "p_nombre": nombre,
        "p_config": config,
        "p_descripcion": descripcion,
        "p_es_base": es_base,
        "p_reemplazar": reemplazar,
    }))


def clonar_escenario(
    origen: str,
    nuevo: str,
    variaciones: dict | None = None,
    descripcion: str | None = None,
) -> str:
    """Copia un escenario sin tocar el original (HU4, HU8). Devuelve el id de la copia."""
    return ejecutar(obtener_cliente().rpc("clonar_escenario", {
        "p_origen": origen,
        "p_nuevo": nuevo,
        "p_variaciones": variaciones or {},
        "p_descripcion": descripcion,
    }))


def eliminar_escenario(nombre: str) -> None:
    """Borra el escenario con su red y sus ejecuciones (en cascada)."""
    ejecutar(obtener_cliente().table("escenarios").delete().eq("nombre", nombre))


def matriz_costos(nombre: str) -> list[dict]:
    """cᵢⱼ calculado por la vista v_matriz_costos, ordenado por fila y columna."""
    esc = cargar_escenario(nombre)["_meta"]["escenario_id"]
    return ejecutar(
        obtener_cliente().table("v_matriz_costos").select("*")
        .eq("escenario_id", esc).order("fila").order("columna")
    )


# ----------------------------------------------------------------- resultados
def guardar_ejecucion(nombre_escenario: str, resultado: BaseModel | dict, **extra: Any) -> str:
    """Guarda una corrida del modelo exacto o del AG. Devuelve el id de la ejecucion.

    `resultado` puede ser ResultadoExacto / ResultadoGenetico (schemas/resultados.py)
    o un dict. En `extra` se pueden pasar campos opcionales:
    parametros, costos_reducidos, rangos_oferta, rangos_demanda,
    costo_transporte, costo_operativo, penalizacion, estado, mensaje.
    """
    datos = resultado.model_dump() if isinstance(resultado, BaseModel) else dict(resultado)
    datos.update(extra)
    return ejecutar(obtener_cliente().rpc("guardar_ejecucion", {
        "p_escenario": nombre_escenario,
        "p_resultado": datos,
    }))


def registrar_comparativo(id_exacto: str, id_genetico: str, notas: str | None = None) -> str:
    return ejecutar(obtener_cliente().rpc("registrar_comparativo", {
        "p_ejecucion_exacto": id_exacto,
        "p_ejecucion_genetico": id_genetico,
        "p_notas": notas,
    }))


def listar_ejecuciones(nombre_escenario: str, metodo: str | None = None, limite: int = 20) -> list[dict]:
    esc = cargar_escenario(nombre_escenario)["_meta"]["escenario_id"]
    consulta = (
        obtener_cliente().table("ejecuciones")
        .select("id, metodo, estado, costo_total, tiempo_s, factible, parametros, creado_en")
        .eq("escenario_id", esc)
    )
    if metodo:
        consulta = consulta.eq("metodo", metodo)
    return ejecutar(consulta.order("creado_en", desc=True).limit(limite))


def obtener_ejecucion(id_ejecucion: str) -> dict | None:
    """Ejecucion con su matriz de asignacion y sus precios sombra."""
    filas = ejecutar(
        obtener_cliente().table("ejecuciones")
        .select("*, asignaciones(*), precios_sombra(*)")
        .eq("id", id_ejecucion).limit(1)
    )
    return filas[0] if filas else None


def listar_comparativos(nombre_escenario: str | None = None) -> list[dict]:
    consulta = obtener_cliente().table("v_comparativos").select("*")
    if nombre_escenario:
        consulta = consulta.eq("escenario", nombre_escenario)
    return ejecutar(consulta.order("creado_en", desc=True))