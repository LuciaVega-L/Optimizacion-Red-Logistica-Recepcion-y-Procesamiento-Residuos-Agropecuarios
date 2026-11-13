"""Análisis de sensibilidad (HU4): precios sombra, rangos de base óptima y escenarios.

Rangos (para la base óptima actual, un parámetro a la vez):

* Costo de una ruta no básica: puede bajar hasta su costo reducido c̄_ij antes de entrar
  a la base; puede subir sin límite.
* Costo de una ruta básica: al quitar la celda del árbol base quedan dos componentes S y T.
  Si c_ij sube δ, los costos reducidos de las rutas S→T bajan δ y los de T→S suben δ.
  El rango es [c_ij − min c̄(T→S), c_ij + min c̄(S→T)].
* Oferta de una agroempresa / capacidad de una planta: el cambio se compensa con el nodo
  ficticio y el flujo se redistribuye por el camino del árbol entre ambos nodos. El rango
  termina cuando algún flujo básico de ese camino llega a 0. Dentro del rango
  ΔZ* = precio sombra × Δ.

Escenarios: cada uno se resuelve con el modelo exacto (y opcionalmente con el AG). Se dice
que "la base óptima se mantiene" si la base del caso base sigue siendo factible y óptima con
los datos del escenario.
"""
import math

from app.schemas.red import Escenario, ParametrosAG, ProblemaTransporte
from app.services.comparativo.metricas import gap_porcentual
from app.services.exacto import base as arbol
from app.services.exacto.modelo import balancear
from app.services.exacto.solver import DetalleExacto, resolver_detallado
from app.services.sensibilidad.escenarios import aplicar

TOL = 1e-6


def _num(x: float) -> float | None:
    """JSON no admite infinito: None significa 'sin límite'."""
    return None if math.isinf(x) else round(x, 6)


# ----------------------------------------------------------------------------- rangos

def rangos_costos(d: DetalleExacto) -> list[dict]:
    b, base = d.balanceado, d.base
    nb, mb = len(b.fuentes), len(b.plantas)
    reducido = [[b.costos[i][j] - d.u[i] - d.v[j] for j in range(mb)] for i in range(nb)]
    en_base = set(base)
    fuera = en_base | b.cerradas          # celdas que no pueden entrar a la base
    filas = []
    for i in range(b.n_real):
        for j in range(b.m_real):
            if (i, j) in b.cerradas:      # ruta deshabilitada: no tiene rango, no se informa
                continue
            c = b.costos[i][j]
            if (i, j) in en_base:
                S = arbol.componente_sin_celda(base, (i, j), ("r", i))
                sube = min((reducido[r][k] for r in range(nb) for k in range(mb)
                            if (r, k) not in fuera and ("r", r) in S and ("c", k) not in S),
                           default=math.inf)
                baja = min((reducido[r][k] for r in range(nb) for k in range(mb)
                            if (r, k) not in fuera and ("r", r) not in S and ("c", k) in S),
                           default=math.inf)
            else:
                sube, baja = math.inf, reducido[i][j]
            filas.append({
                "ruta": f"{b.fuentes[i]}→{b.plantas[j]}", "fuente": b.fuentes[i],
                "planta": b.plantas[j], "basica": (i, j) in en_base,
                "flujo": d.X[i][j], "costo_actual": c,
                "costo_reducido": _num(max(0.0, reducido[i][j])),
                "aumento_permitido": _num(max(0.0, sube)),
                "disminucion_permitida": _num(max(0.0, baja)),
                "minimo": _num(c - max(0.0, baja)), "maximo": _num(c + max(0.0, sube)),
            })
    return filas


def _rango_por_camino(d: DetalleExacto, origen, destino, valor_actual):
    pasos = arbol.camino(d.base, origen, destino)
    if pasos is None:
        return math.inf, valor_actual
    aumento = min((d.X[i][j] for (i, j), s in pasos if s < 0), default=math.inf)
    disminucion = min([valor_actual] + [d.X[i][j] for (i, j), s in pasos if s > 0])
    return aumento, disminucion


def rangos_recursos(d: DetalleExacto) -> dict:
    b = d.balanceado
    fict = b.indice_ficticio
    oferta, capacidad = [], []
    for i in range(b.n_real):
        if fict is None:
            aumento, dism, nota = 0.0, 0.0, "Red balanceada: cambiar una sola oferta la desbalancea."
        else:
            aumento, dism = _rango_por_camino(d, ("r", i), fict, b.oferta[i])
            nota = None
        oferta.append({"id": b.fuentes[i], "valor_actual": b.oferta[i],
                       "precio_sombra": d.u[i], "aumento_permitido": _num(aumento),
                       "disminucion_permitida": _num(dism),
                       "minimo": _num(b.oferta[i] - dism), "maximo": _num(b.oferta[i] + aumento),
                       "nota": nota})
    for j in range(b.m_real):
        if fict is None:
            aumento, dism, nota = 0.0, 0.0, "Red balanceada: cambiar una sola capacidad la desbalancea."
        else:
            aumento, dism = _rango_por_camino(d, fict, ("c", j), b.demanda[j])
            nota = None
        capacidad.append({"id": b.plantas[j], "valor_actual": b.demanda[j],
                          "precio_sombra": d.v[j], "aumento_permitido": _num(aumento),
                          "disminucion_permitida": _num(dism),
                          "minimo": _num(b.demanda[j] - dism), "maximo": _num(b.demanda[j] + aumento),
                          "nota": nota})
    return {"oferta": oferta, "capacidad": capacidad}


def rangos(problema: ProblemaTransporte) -> dict:
    d = resolver_detallado(problema)
    return {"costo_total": d.resultado.costo_total,
            "costos": rangos_costos(d), **rangos_recursos(d)}


# ----------------------------------------------------------------------------- escenarios

def base_se_mantiene(d_base: DetalleExacto, problema: ProblemaTransporte) -> bool:
    """¿La base óptima del caso base sigue siendo factible y óptima con estos datos?"""
    b0 = d_base.balanceado
    b1 = balancear(problema)
    tipo0 = b0.ficticio["tipo"] if b0.ficticio else None
    tipo1 = b1.ficticio["tipo"] if b1.ficticio else None
    if tipo0 != tipo1 or len(b1.fuentes) != len(b0.fuentes) or len(b1.plantas) != len(b0.plantas):
        return False
    flujos = arbol.flujos_desde_base(d_base.base, b1.oferta, b1.demanda)
    if len(flujos) != len(d_base.base) or any(x < -TOL for x in flujos.values()):
        return False
    n, m = len(b1.fuentes), len(b1.plantas)
    u, v = arbol.duales_desde_base(d_base.base, b1.costos, n, m)
    return all(b1.costos[i][j] - u[i] - v[j] >= -TOL for i in range(n) for j in range(m)
               if (i, j) not in b1.cerradas)


def _ejecutar_ag(problema: ProblemaTransporte, parametros: ParametrosAG | None):
    """Resuelve el escenario con el AG. Si el AG falla, se informa el error en ese
    escenario sin detener el análisis exacto."""
    try:
        from app.services.genetico import algoritmo
        res = algoritmo.ejecutar(problema, parametros or ParametrosAG())
        return {"costo_total": res.costo_total, "tiempo_s": res.tiempo_s,
                "factible": res.factible, "asignacion": res.asignacion}, None
    except Exception as e:  # noqa: BLE001 - el AG es opcional en este análisis
        return None, f"AG no disponible: {type(e).__name__}: {e}"


def _resumen(nombre, res, costo_base):
    return {
        "nombre": nombre,
        "costo_total": res.costo_total,
        "variacion_costo": res.costo_total - costo_base,
        "variacion_costo_pct": gap_porcentual(res.costo_total, costo_base),
        "tiempo_s": res.tiempo_s,
        "asignacion": res.asignacion,
        "precios_sombra_oferta": res.precios_sombra_oferta,
        "precios_sombra_demanda": res.precios_sombra_demanda,
        "holgura_plantas": res.holgura_plantas,
        "nodo_ficticio": res.nodo_ficticio.model_dump() if res.nodo_ficticio else None,
        "factible": res.factible,
    }


def simular(problema: ProblemaTransporte, escenarios: list[Escenario],
            incluir_ag: bool = False, parametros_ag: ParametrosAG | None = None) -> dict:
    """Para cada escenario: aplicar la variación, resolver con exacto (y AG) y comparar.
    El problema original no se modifica."""
    d_base = resolver_detallado(problema)
    costo_base = d_base.resultado.costo_total
    salida_base = _resumen("Caso base", d_base.resultado, costo_base)
    if incluir_ag:
        salida_base["genetico"], salida_base["error_ag"] = _ejecutar_ag(problema, parametros_ag)

    resultados = []
    for esc in escenarios:
        fila = {"escenario": esc.model_dump()}
        try:
            modificado = aplicar(problema, esc)
            d = resolver_detallado(modificado)
        except Exception as e:  # noqa: BLE001 - se informa por escenario
            fila["error"] = str(e)
            resultados.append(fila)
            continue
        fila.update(_resumen(esc.nombre, d.resultado, costo_base))
        fila["base_optima_se_mantiene"] = base_se_mantiene(d_base, modificado)
        if incluir_ag:
            ag, error = _ejecutar_ag(modificado, parametros_ag)
            fila["genetico"], fila["error_ag"] = ag, error
            if ag:
                fila["gap_pct"] = gap_porcentual(ag["costo_total"], d.resultado.costo_total)
        resultados.append(fila)

    return {"base": salida_base, "rangos": {"costos": rangos_costos(d_base), **rangos_recursos(d_base)},
            "escenarios": resultados}


def escenarios_predefinidos(problema: ProblemaTransporte) -> list[Escenario]:
    """Escenarios sugeridos para el informe y la sustentación."""
    lista = [
        Escenario(nombre="Combustible +10 %", variacion_costos_pct=10),
        Escenario(nombre="Combustible +25 %", variacion_costos_pct=25),
        Escenario(nombre="Combustible −10 %", variacion_costos_pct=-10),
        Escenario(nombre="Oferta total +10 %", variacion_oferta_pct=10),
        Escenario(nombre="Oferta total −15 %", variacion_oferta_pct=-15),
    ]
    for planta in problema.plantas:
        lista.append(Escenario(nombre=f"Cuello de botella {planta} (−30 %)",
                               variacion_demanda_pct=-30, demanda_objetivo=planta))
    return lista
