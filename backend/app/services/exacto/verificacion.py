"""Verifica que una asignación cumpla oferta, capacidad y no negatividad (HU2).

Se usa para el modelo exacto y también sirve para revisar la solución del AG.
"""
TOL = 1e-6


def verificar(asignacion, oferta, demanda, fuentes=None, plantas=None,
              oferta_con_igualdad: bool = True, tol: float = TOL) -> list[dict]:
    """Devuelve una fila por restricción con su lado izquierdo, derecho y si se cumple.

    oferta_con_igualdad=False se usa cuando falta capacidad (planta ficticia): en ese caso
    una agroempresa puede despachar menos que su oferta (Σ_j x_ij ≤ O_i).
    """
    n, m = len(oferta), len(demanda)
    fuentes = fuentes or [f"F{i + 1}" for i in range(n)]
    plantas = plantas or [f"P{j + 1}" for j in range(m)]
    filas = []

    for i in range(n):
        enviado = sum(asignacion[i])
        if oferta_con_igualdad:
            cumple, op = abs(enviado - oferta[i]) <= tol * max(1.0, oferta[i]), "="
        else:
            cumple, op = enviado <= oferta[i] + tol * max(1.0, oferta[i]), "≤"
        filas.append({"restriccion": f"Oferta {fuentes[i]}", "tipo": "oferta",
                      "lado_izquierdo": enviado, "operador": op,
                      "lado_derecho": oferta[i], "cumple": cumple})

    for j in range(m):
        recibido = sum(asignacion[i][j] for i in range(n))
        filas.append({"restriccion": f"Capacidad {plantas[j]}", "tipo": "capacidad",
                      "lado_izquierdo": recibido, "operador": "≤", "lado_derecho": demanda[j],
                      "cumple": recibido <= demanda[j] + tol * max(1.0, demanda[j])})

    minimo = min((v for fila in asignacion for v in fila), default=0.0)
    filas.append({"restriccion": f"No negatividad ({n * m} variables x_ij)",
                  "tipo": "no_negatividad", "lado_izquierdo": minimo, "operador": "≥",
                  "lado_derecho": 0.0, "cumple": minimo >= -tol})
    return filas


def es_factible(asignacion, oferta, demanda, tol: float = TOL) -> bool:
    return all(f["cumple"] for f in verificar(asignacion, oferta, demanda, tol=tol))
