
import json
import uuid
from decimal import Decimal
from typing import Any

from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from app.db.modelos import Escenario, PrecioSombra, Resultado
from app.db.sesion import ErrorBaseDatos, EscenarioNoEncontrado, sesion


def _json(valor: Any) -> str:
    return json.dumps(valor, default=float)


def _fila_a_dict(fila) -> dict:
    """Fila de una vista -> dict listo para JSON (UUID a texto, Decimal a float)."""
    d = dict(fila._mapping)
    for k, v in d.items():
        if isinstance(v, uuid.UUID):
            d[k] = str(v)
        elif isinstance(v, Decimal):
            d[k] = float(v)
    return d


def _escenario_por_nombre(s, nombre: str) -> Escenario:
    esc = s.scalar(select(Escenario).where(Escenario.nombre == nombre))
    if esc is None:
        raise EscenarioNoEncontrado(f'No existe el escenario "{nombre}"')
    return esc


#  escenarios
def listar_escenarios() -> list[str]:
    with sesion() as s:
        return list(s.scalars(select(Escenario.nombre).order_by(Escenario.nombre)))


def historial_escenarios() -> list[dict]:
    with sesion() as s:
        filas = s.execute(text("select * from public.v_resumen_escenarios order by fecha desc"))
        return [_fila_a_dict(f) for f in filas]


def cargar_escenario(nombre: str) -> dict:
    with sesion() as s:
        return s.scalar(text("select public.obtener_config_escenario(:n)"), {"n": nombre})


def obtener_escenario(nombre: str) -> dict:
    with sesion() as s:
        return _escenario_por_nombre(s, nombre).a_dict()


def guardar_escenario(nombre: str, config: dict, descripcion: str | None = None,
                      es_base: bool = False, reemplazar: bool = False) -> str:
    with sesion() as s:
        return str(s.scalar(
            text("select public.guardar_config_escenario(:n, cast(:c as jsonb), :d, :b, :r)"),
            {"n": nombre, "c": _json(config), "d": descripcion, "b": es_base, "r": reemplazar}))


def clonar_escenario(origen: str, nuevo: str, variaciones: dict | None = None,
                     descripcion: str | None = None) -> str:
    with sesion() as s:
        return str(s.scalar(
            text("select public.clonar_escenario(:o, :n, cast(:v as jsonb), :d)"),
            {"o": origen, "n": nuevo, "v": _json(variaciones or {}), "d": descripcion}))


def eliminar_escenario(nombre: str) -> bool:
    with sesion() as s:
        esc = s.scalar(select(Escenario).where(Escenario.nombre == nombre))
        if esc is None:
            return False
        s.delete(esc)
        return True


#resultados
def guardar_resultado(
    escenario: str,
    algoritmo_utilizado: str,
    costo_total: float,
    tiempo_ejecucion_ms: float,
    matriz_flujos: list[list[float]],
    factible: bool | None = None,
    parametros_algoritmo: dict | None = None,
    historial_fitness: list[float] | None = None,
    costo_transporte: float | None = None,
    costo_operativo: float | None = None,
    precios_sombra_oferta: list[float] | None = None,
    precios_sombra_demanda: list[float] | None = None,
    rangos_oferta: list[list[float]] | None = None,
    rangos_demanda: list[list[float]] | None = None,
) -> dict:

    with sesion() as s:
        esc = _escenario_por_nombre(s, escenario)
        res = Resultado(
            escenario_id=esc.id,
            algoritmo_utilizado=algoritmo_utilizado,
            costo_total=costo_total,
            tiempo_ejecucion_ms=tiempo_ejecucion_ms,
            matriz_flujos_json=[[float(x) for x in fila] for fila in matriz_flujos],
            factible=factible,
            parametros_algoritmo=parametros_algoritmo or {},
            historial_fitness=historial_fitness,
            costo_transporte=costo_transporte,
            costo_operativo=costo_operativo,
        )
        s.add(res)
        s.flush()
        s.refresh(res)   # lee lo que calcularon los triggers (gap, costos, códigos)

        codigos_e = res.matriz_flujos_json["agroempresas"]
        codigos_p = res.matriz_flujos_json["plantas"]
        _agregar_duales(s, res, "oferta", codigos_e, precios_sombra_oferta, rangos_oferta)
        if precios_sombra_demanda:
            recibido = [sum(fila[j] for fila in matriz_flujos) for j in range(len(codigos_p))]
            capacidades = esc.parametros_entrada.get("demanda", [])
            holguras = [float(c) - r for c, r in zip(capacidades, recibido)]
            _agregar_duales(s, res, "capacidad", codigos_p, precios_sombra_demanda, rangos_demanda, holguras)
        s.flush()
        s.refresh(res)
        return res.a_dict(incluir_detalle=True)


def _agregar_duales(s, res, tipo, codigos, valores, rangos=None, holguras=None):
    if not valores:
        return
    if len(valores) != len(codigos):
        raise ErrorBaseDatos(f"precios sombra de {tipo}: se esperaban {len(codigos)} valores", 422)
    for k, (codigo, valor) in enumerate(zip(codigos, valores)):
        rango = rangos[k] if rangos and k < len(rangos) else [None, None]
        s.add(PrecioSombra(resultado_id=res.id, tipo=tipo, nodo_codigo=codigo, valor_dual=valor,
                           holgura=holguras[k] if holguras else None,
                           rango_inferior=rango[0], rango_superior=rango[1]))


def guardar_solucion(escenario: str, solucion: BaseModel, **extra: Any) -> dict:

    d = solucion.model_dump()
    return guardar_resultado(
        escenario=escenario,
        algoritmo_utilizado=d["metodo"],
        costo_total=d["costo_total"],
        tiempo_ejecucion_ms=d["tiempo_s"] * 1000,
        matriz_flujos=d["asignacion"],
        factible=d.get("factible"),
        historial_fitness=d.get("historial_fitness") or None,
        precios_sombra_oferta=d.get("precios_sombra_oferta") or None,
        precios_sombra_demanda=d.get("precios_sombra_demanda") or None,
        **extra,
    )


def listar_resultados(escenario: str | None = None, algoritmo: str | None = None,
                      limite: int = 50, incluir_matriz: bool = False) -> list[dict]:
    with sesion() as s:
        consulta = select(Resultado).options(selectinload(Resultado.escenario))
        if escenario:
            consulta = consulta.where(Resultado.escenario_id == _escenario_por_nombre(s, escenario).id)
        if algoritmo:
            alg = "Exacto" if algoritmo.lower().startswith("exact") else "Genético"
            consulta = consulta.where(Resultado.algoritmo_utilizado == alg)
        consulta = consulta.order_by(Resultado.fecha.desc()).limit(limite)
        return [r.a_dict(incluir_matriz=incluir_matriz) for r in s.scalars(consulta)]


def obtener_resultado(id_resultado: str) -> dict | None:
    try:
        rid = uuid.UUID(str(id_resultado))
    except ValueError:
        return None
    with sesion() as s:
        res = s.scalar(select(Resultado).where(Resultado.id == rid)
                       .options(selectinload(Resultado.escenario), selectinload(Resultado.precios_sombra)))
        return res.a_dict(incluir_detalle=True) if res else None


def historial_comparativo(escenario: str | None = None) -> list[dict]:
    with sesion() as s:
        sql = "select * from public.v_historial_comparativo"
        params = {}
        if escenario:
            sql += " where escenario = :e"
            params["e"] = escenario
        filas = s.execute(text(sql + " order by fecha_ultimo_resultado desc nulls last"), params)
        return [_fila_a_dict(f) for f in filas]
