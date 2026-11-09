"""Validaciones de consistencia de la red (dimensiones, valores negativos, vacíos, balance).

`validar` devuelve una lista de mensajes de error legibles para el usuario (HU1).
Una lista vacía significa que el problema se puede enviar a los solucionadores.
"""
import math

from app.schemas.red import ProblemaTransporte

TOL = 1e-9


def _es_numero_valido(valor) -> bool:
    return isinstance(valor, (int, float)) and math.isfinite(valor)


def _validar_ids(ids: list[str], tipo: str) -> list[str]:
    errores = []
    if not ids:
        errores.append(f"Debe haber al menos una {tipo}.")
    vacios = [k + 1 for k, x in enumerate(ids) if not str(x).strip()]
    if vacios:
        errores.append(f"Hay {tipo}s sin identificador (posiciones {vacios}).")
    repetidos = sorted({x for x in ids if ids.count(x) > 1})
    if repetidos:
        errores.append(f"Identificadores de {tipo} repetidos: {', '.join(repetidos)}.")
    return errores


def _validar_vector(valores: list[float], ids: list[str], nombre: str) -> list[str]:
    errores = []
    for k, v in enumerate(valores):
        etiqueta = ids[k] if k < len(ids) else f"#{k + 1}"
        if not _es_numero_valido(v):
            errores.append(f"{nombre} de {etiqueta} está vacía o no es un número.")
        elif v < 0:
            errores.append(f"{nombre} de {etiqueta} no puede ser negativa ({v}).")
    return errores


def validar(problema: ProblemaTransporte) -> list[str]:
    errores = []
    n, m = len(problema.fuentes), len(problema.plantas)

    errores += _validar_ids(problema.fuentes, "agroempresa")
    errores += _validar_ids(problema.plantas, "planta")
    comunes = set(problema.fuentes) & set(problema.plantas)
    if comunes:
        errores.append(f"Un mismo id no puede ser agroempresa y planta: {', '.join(sorted(comunes))}.")

    # Dimensiones
    if len(problema.oferta) != n:
        errores.append("La oferta no coincide con el número de fuentes.")
    if len(problema.demanda) != m:
        errores.append("La demanda no coincide con el número de plantas.")
    if len(problema.costos) != n or any(len(f) != m for f in problema.costos):
        errores.append("La matriz de costos debe ser fuentes x plantas.")
    if errores:
        return errores

    # Valores
    errores += _validar_vector(problema.oferta, problema.fuentes, "La oferta")
    errores += _validar_vector(problema.demanda, problema.plantas, "La capacidad")
    for i, fila in enumerate(problema.costos):
        for j, c in enumerate(fila):
            ruta = f"{problema.fuentes[i]}→{problema.plantas[j]}"
            if not _es_numero_valido(c):
                errores.append(f"El costo de la ruta {ruta} está vacío o no es un número.")
            elif c < 0:
                errores.append(f"El costo de la ruta {ruta} no puede ser negativo ({c}).")

    # Datos de origen opcionales
    if problema.distancias is not None:
        if len(problema.distancias) != n or any(len(f) != m for f in problema.distancias):
            errores.append("La matriz de distancias debe ser fuentes x plantas.")
        elif any(not _es_numero_valido(d) or d < 0 for f in problema.distancias for d in f):
            errores.append("Las distancias deben ser números no negativos.")
    if problema.costo_km_ton is not None and (
        not _es_numero_valido(problema.costo_km_ton) or problema.costo_km_ton < 0
    ):
        errores.append("El costo por km·ton debe ser un número no negativo.")
    if problema.costo_operativo is not None:
        if len(problema.costo_operativo) != m:
            errores.append("El costo operativo debe tener un valor por planta.")
        else:
            errores += _validar_vector(problema.costo_operativo, problema.plantas, "El costo operativo")

    if not errores and sum(problema.oferta) <= TOL:
        errores.append("La oferta total debe ser mayor que cero.")
    return errores


def esta_balanceado(problema: ProblemaTransporte) -> bool:
    return abs(sum(problema.oferta) - sum(problema.demanda)) < 1e-6


def estado_balance(problema: ProblemaTransporte) -> dict:
    """Resumen para la interfaz: balanceado, oferta < capacidad u oferta > capacidad."""
    oferta, capacidad = sum(problema.oferta), sum(problema.demanda)
    if esta_balanceado(problema):
        estado, mensaje = "balanceado", "La red está balanceada (oferta = capacidad)."
    elif oferta < capacidad:
        estado = "oferta_menor"
        mensaje = (f"Red desbalanceada: sobran {capacidad - oferta:g} t/sem de capacidad. "
                   "Se agrega una agroempresa ficticia con costo 0.")
    else:
        estado = "oferta_mayor"
        mensaje = (f"Red desbalanceada: faltan {oferta - capacidad:g} t/sem de capacidad. "
                   "Se agrega una planta ficticia: ese residuo queda sin procesar.")
    return {"estado": estado, "oferta_total": oferta, "capacidad_total": capacidad,
            "diferencia": capacidad - oferta, "mensaje": mensaje}
