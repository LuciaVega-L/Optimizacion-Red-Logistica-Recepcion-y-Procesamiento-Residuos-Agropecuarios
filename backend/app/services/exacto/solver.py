import time
from dataclasses import dataclass

import pulp

from app.schemas.red import ProblemaTransporte
from app.schemas.resultados import NodoFicticio, ResultadoExacto, VerificacionRestriccion
from app.services.exacto import base as arbol
from app.services.exacto.modelo import ModeloTransporte, ProblemaBalanceado, construir_modelo
from app.services.exacto.verificacion import verificar
from app.services.red.validacion import validar

TOL = 1e-6


class ProblemaInvalido(ValueError):
    """Los datos no pasan la validación de la red."""


@dataclass
class DetalleExacto:
    """Información interna que reutiliza el análisis de sensibilidad."""
    resultado: ResultadoExacto
    balanceado: ProblemaBalanceado
    X: list[list[float]]          # flujos en la forma balanceada
    u: list[float]                # duales de oferta (forma balanceada)
    v: list[float]                # duales de capacidad (forma balanceada)
    base: list[tuple[int, int]]   # celdas básicas (árbol generador)


def _limpiar(valor: float) -> float:
    return 0.0 if abs(valor) < 1e-9 else float(valor)


def _normalizar_duales(b: ProblemaBalanceado, base, costos):
    n, m = len(b.fuentes), len(b.plantas)
    fijo = b.indice_ficticio or ("r", 0)
    u, v = arbol.duales_desde_base(base, costos, n, m, fijo=fijo)
    if b.ficticio is None:                 # balanceado: max v_j = 0 para que v_j ≤ 0
        corrimiento = max(v)
        u = [x + corrimiento for x in u]
        v = [x - corrimiento for x in v]
    return [_limpiar(x) for x in u], [_limpiar(x) for x in v]


def resolver_detallado(problema: ProblemaTransporte, costo_no_procesado: float = 0.0) -> DetalleExacto:
    errores = validar(problema)
    if errores:
        raise ProblemaInvalido(" ".join(errores))

    inicio = time.perf_counter()
    modelo: ModeloTransporte = construir_modelo(problema, costo_no_procesado)
    modelo.lp.solve(pulp.PULP_CBC_CMD(msg=False))
    tiempo = time.perf_counter() - inicio
    estado = pulp.LpStatus[modelo.lp.status]
    if estado == "Infeasible":
        raise ProblemaInvalido(
            "No existe una asignación factible: con las rutas deshabilitadas, alguna agroempresa "
            "no puede enviar toda su oferta o alguna planta no puede recibir lo que le corresponde.")
    if estado != "Optimal":
        raise RuntimeError(f"El solver terminó con estado '{estado}'.")

    b = modelo.balanceado
    nb, mb = len(b.fuentes), len(b.plantas)
    X = [[max(0.0, _limpiar(modelo.x[i, j].value() or 0.0)) for j in range(mb)] for i in range(nb)]

    # Duales del solver → árbol base → duales normalizados (únicos para esa base)
    u0 = [modelo.lp.constraints[r].pi for r in modelo.r_oferta]
    v0 = [modelo.lp.constraints[r].pi for r in modelo.r_demanda]
    if any(p is None for p in u0 + v0):
        u0 = v0 = None
    base = arbol.construir_base(X, b.costos, u0, v0, prohibidas=b.cerradas)
    u, v = _normalizar_duales(b, base, b.costos)

    n, m = b.n_real, b.m_real
    asignacion = [X[i][:m] for i in range(n)]
    costo_total = sum(problema.costos[i][j] * asignacion[i][j] for i in range(n) for j in range(m))
    reducidos_bal = [[_limpiar(b.costos[i][j] - u[i] - v[j]) for j in range(mb)] for i in range(nb)]
    recibido = [sum(asignacion[i][j] for i in range(n)) for j in range(m)]

    # Verificación de restricciones (modelo original, no el balanceado)
    falta_capacidad = b.ficticio is not None and b.ficticio["tipo"] == "planta"
    filas = verificar(asignacion, problema.oferta, problema.demanda, problema.fuentes,
                      problema.plantas, oferta_con_igualdad=not falta_capacidad)
    holgura_ok = all(abs(v[j]) < TOL or problema.demanda[j] - recibido[j] < TOL for j in range(m))
    # Las rutas cerradas no pueden entrar a la base: su costo reducido no cuenta para la optimalidad
    optimo_ok = (all(reducidos_bal[i][j] >= -TOL for i in range(nb) for j in range(mb)
                     if (i, j) not in b.cerradas)
                 and all(abs(reducidos_bal[i][j]) < TOL for i, j in base)
                 and (falta_capacidad or (all(x <= TOL for x in v[:m]) and holgura_ok)))

    ficticio = None
    if b.ficticio is not None:
        if b.ficticio["tipo"] == "fuente":
            flujos = X[nb - 1][:m]
        else:
            flujos = [X[i][mb - 1] for i in range(n)]
        ficticio = NodoFicticio(**b.ficticio, flujos=flujos)

    resultado = ResultadoExacto(
        metodo="exacto",
        costo_total=_limpiar(costo_total),
        asignacion=asignacion,
        tiempo_s=tiempo,
        factible=all(f["cumple"] for f in filas),
        estado=estado,
        fuentes=list(problema.fuentes),
        plantas=list(problema.plantas),
        precios_sombra_oferta=u[:n],
        precios_sombra_demanda=v[:m],
        costos_reducidos=[fila[:m] for fila in reducidos_bal[:n]],
        holgura_plantas=[_limpiar(problema.demanda[j] - recibido[j]) for j in range(m)],
        nodo_ficticio=ficticio,
        variables_basicas=[f"{b.fuentes[i]}→{b.plantas[j]}" for i, j in sorted(base)],
        rutas_optimo_alternativo=[f"{b.fuentes[i]}→{b.plantas[j]}" for i in range(n) for j in range(m)
                                  if (i, j) not in set(base) and (i, j) not in b.cerradas
                                  and abs(reducidos_bal[i][j]) < TOL],
        degenerada=sum(1 for i, j in base if X[i][j] > TOL) < nb + mb - 1,
        optimalidad_verificada=optimo_ok,
        verificacion=[VerificacionRestriccion(**f) for f in filas],
    )
    return DetalleExacto(resultado, b, X, u, v, base)


def resolver(problema: ProblemaTransporte, costo_no_procesado: float = 0.0) -> ResultadoExacto:
    """Resuelve el modelo de transporte, mide el tiempo y extrae precios sombra."""
    return resolver_detallado(problema, costo_no_procesado).resultado
