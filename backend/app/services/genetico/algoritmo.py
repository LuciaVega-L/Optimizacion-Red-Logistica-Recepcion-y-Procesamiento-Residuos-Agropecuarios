"""Algoritmo Genético para el problema de transporte (agroempresas -> plantas).

Dos formas de uso:

* ejecutar(problema, parametros)  -> ResultadoGenetico    (API / comparativo / sensibilidad)
* AlgoritmoGenetico(datosRed, ...).ejecutar()            -> dict (uso directo, scripts, pruebas)

El adaptador `ejecutar` construye los datos desde el MISMO modelo balanceado que usa el solver
exacto (balancear(problema)): idénticos c_ij, ofertas, capacidades y nodo ficticio. Así ambos
métodos resuelven el mismo problema y el gap es comparable.
"""
import random
import time

from .fitness import EvaluadorFitness
from .cromosoma import FabricaCromosomas
from . import operadores as ops


class AlgoritmoGenetico:

    def __init__(
        self,
        datosRed: dict,
        tamanoPoblacion: int = 100,
        generaciones: int = 300,
        probCruce: float = 0.9,
        probMutacion: float = 0.2,
        tamTorneo: int = 3,
        seleccion: str = "torneo",   # "torneo" | "ruleta"
        cruce: str = "un_punto",     # "un_punto" | "dos_puntos"
        numElites: int = 2,
        paciencia: int = 0,
        semilla: int | None = None,
    ):
        self.datosRed = datosRed
        self.tamanoPoblacion = tamanoPoblacion
        self.generaciones = generaciones
        self.probCruce = probCruce
        self.probMutacion = probMutacion
        self.tamTorneo = tamTorneo
        self.seleccion = seleccion
        self.cruce = cruce
        self.numElites = numElites
        self.paciencia = paciencia  # 0 = sin parada anticipada

        self.rng = random.Random(semilla)
        self.evaluador = EvaluadorFitness(datosRed)
        self.fabrica = FabricaCromosomas(datosRed, self.rng)

    def _evaluarPoblacion(self, poblacion: list) -> list:
        return [self.evaluador.evaluarIndividuo(ind) for ind in poblacion]

    def _seleccionar(self, poblacion, aptitudes):
        if self.seleccion == "ruleta":
            return ops.seleccion_ruleta(poblacion, aptitudes, self.rng)
        return ops.seleccion_torneo(poblacion, aptitudes, self.tamTorneo, self.rng)

    def ejecutar(self, verbose: bool = False) -> dict:
        poblacion = self.fabrica.crearPoblacion(self.tamanoPoblacion)
        evaluaciones = self._evaluarPoblacion(poblacion)

        mejorCromosoma, mejorEval = None, None
        historial = []
        sinMejora = 0
        generacionesEjecutadas = 0

        for gen in range(self.generaciones):
            generacionesEjecutadas = gen + 1
            # Se ordena por costoTotalZ (menor = mejor): evita los empates por
            # redondeo que tendría el fitness 1/(1+Z) con Z del orden de 1e8.
            orden = sorted(range(len(poblacion)), key=lambda k: evaluaciones[k]["costoTotalZ"])
            idxMejor = orden[0]

            if mejorEval is None or evaluaciones[idxMejor]["costoTotalZ"] < mejorEval["costoTotalZ"] - 1e-6:
                mejorCromosoma = FabricaCromosomas.copiar(poblacion[idxMejor])
                mejorEval = dict(evaluaciones[idxMejor])
                sinMejora = 0
            else:
                sinMejora += 1

            costos = [e["costoTotalZ"] for e in evaluaciones]
            aptitudes = [1.0 / (1.0 + c) for c in costos]
            historial.append({
                "generacion": gen,
                "mejorCostoZ": mejorEval["costoTotalZ"],
                "promedioCostoZ": sum(costos) / len(costos),
                "porcentajeFactibles": 100.0 * sum(e["esFactible"] for e in evaluaciones) / len(evaluaciones),
            })
            if verbose and (gen % 25 == 0 or gen == self.generaciones - 1):
                print(f"Gen {gen:4d} | mejor Z = {mejorEval['costoTotalZ']:,.2f} | "
                      f"factible = {mejorEval['esFactible']}")

            if self.paciencia and sinMejora >= self.paciencia:
                if verbose:
                    print(f"Parada anticipada en la generación {gen} (sin mejora en {self.paciencia}).")
                break

            # --- nueva generación ---
            nueva = [FabricaCromosomas.copiar(poblacion[k]) for k in orden[:self.numElites]]
            while len(nueva) < self.tamanoPoblacion:
                p1 = self._seleccionar(poblacion, aptitudes)
                p2 = self._seleccionar(poblacion, aptitudes)

                if self.rng.random() < self.probCruce:
                    funcionCruce = ops.cruce_un_punto if self.cruce == "un_punto" else ops.cruce_dos_puntos
                    h1, h2 = funcionCruce(p1, p2, self.rng)
                else:
                    h1, h2 = p1, p2

                for hijo in (h1, h2):
                    ops.mutar(hijo, self.probMutacion, self.rng)
                    self.fabrica.reparar(hijo)
                    if len(nueva) < self.tamanoPoblacion:
                        nueva.append(hijo)

            poblacion = nueva
            evaluaciones = self._evaluarPoblacion(poblacion)

        return {
            "mejorCromosoma": mejorCromosoma,
            "evaluacion": mejorEval,
            "historial": historial,
            "generacionesEjecutadas": generacionesEjecutadas,
            "asignacion": self.resumenAsignacion(mejorCromosoma) if mejorCromosoma is not None else [],
        }

    def resumenAsignacion(self, cromosoma: list, umbral: float = 0.01, soloReales: bool = False) -> list:
        """Lista legible: empresa -> planta -> toneladas/semana."""
        nE = self.datosRed.get("n_real", len(self.fabrica.agroempresas)) if soloReales else None
        nP = self.datosRed.get("m_real", len(self.fabrica.plantas)) if soloReales else None
        resumen = []
        for i, empresa in enumerate(self.fabrica.agroempresas):
            if nE is not None and i >= nE:
                continue
            for j, planta in enumerate(self.fabrica.plantas):
                if nP is not None and j >= nP:
                    continue
                ton = cromosoma[i][j]
                if ton > umbral:
                    resumen.append({
                        "agroempresa": empresa.get("nombre"),
                        "planta": planta.get("nombre"),
                        "toneladas": round(ton, 2),
                    })
        return resumen


# ============================================================================ adaptador

def _param(parametros, nombres, defecto):
    """Lee el primer atributo existente (y no None) de `parametros` entre varios alias."""
    for n in nombres:
        v = parametros.get(n) if isinstance(parametros, dict) else getattr(parametros, n, None)
        if v is not None:
            return v
    return defecto


def _norm(texto, validos, defecto):
    t = str(texto).strip().lower().replace(" ", "_").replace("-", "_")
    t = t.replace("1_punto", "un_punto").replace("2_puntos", "dos_puntos")
    return t if t in validos else defecto


def _kwargs_desde_parametros(parametros) -> dict:
    return {
        "tamanoPoblacion": int(_param(parametros, ("tamano_poblacion", "tam_poblacion", "poblacion"), 100)),
        "generaciones": int(_param(parametros, ("generaciones", "num_generaciones"), 300)),
        "probCruce": float(_param(parametros, ("prob_cruce", "probabilidad_cruce", "tasa_cruce"), 0.9)),
        "probMutacion": float(_param(parametros, ("prob_mutacion", "probabilidad_mutacion", "tasa_mutacion"), 0.2)),
        "tamTorneo": int(_param(parametros, ("tam_torneo", "tamano_torneo", "k_torneo"), 3)),
        "seleccion": _norm(_param(parametros, ("seleccion", "metodo_seleccion"), "torneo"),
                           ("torneo", "ruleta"), "torneo"),
        "cruce": _norm(_param(parametros, ("cruce", "metodo_cruce", "tipo_cruce"), "un_punto"),
                       ("un_punto", "dos_puntos"), "un_punto"),
        "numElites": int(_param(parametros, ("num_elites", "elites", "elitismo"), 2)),
        "paciencia": int(_param(parametros, ("paciencia", "early_stopping"), 0)),
        "semilla": _param(parametros, ("semilla", "seed"), None),
    }


def _datos_desde_problema(problema) -> dict:
    """Mismos datos que el solver exacto: red balanceada (incluye el nodo ficticio)."""
    from app.services.exacto.modelo import balancear
    b = balancear(problema)
    return {
        "agroempresas": [{"id": f, "nombre": f, "oferta_ton_sem": float(b.oferta[i])}
                         for i, f in enumerate(b.fuentes)],
        "plantas": [{"id": p, "nombre": p, "capacidad_maxima_ton_sem": float(b.demanda[j])}
                    for j, p in enumerate(b.plantas)],
        "matriz_costos": [[float(c) for c in fila] for fila in b.costos],
        "n_real": b.n_real,
        "m_real": b.m_real,
        "prohibidas": sorted(b.cerradas),
        # λ de los datos (dataConfig "penalizaciones"); sin ellos, fitness.py usa el mayor c_ij
        "penalizaciones": {k: float(v) for k, v in (("factorPlanta", problema.penalizacion_oferta),
                                                    ("factorDemanda", problema.penalizacion_capacidad))
                           if v is not None},
    }


def ejecutar(problema, parametros=None):
    """Punto de entrada del API: ProblemaTransporte + ParametrosAG -> ResultadoGenetico."""
    from app.schemas.red import ParametrosAG
    from app.schemas.resultados import ResultadoGenetico

    parametros = parametros if parametros is not None else ParametrosAG()
    datos = _datos_desde_problema(problema)
    ag = AlgoritmoGenetico(datos, **_kwargs_desde_parametros(parametros))

    t0 = time.perf_counter()
    res = ag.ejecutar(verbose=False)
    tiempo = time.perf_counter() - t0

    cromo, ev = res["mejorCromosoma"], res["evaluacion"]
    nR, mR = datos["n_real"], datos["m_real"]
    # Z sin penalización, solo rutas reales (las del nodo ficticio no son transporte)
    costo_real = sum(datos["matriz_costos"][i][j] * cromo[i][j] for i in range(nR) for j in range(mR))

    campos = {
        "metodo": "genetico",   # revisa en schemas/resultados.py si es un Literal con otro valor
        "costo_total": round(costo_real, 2),
        "tiempo_s": round(tiempo, 4),
        "factible": bool(ev["esFactible"]),
        "asignacion": [[round(cromo[i][j], 4) for j in range(mR)] for i in range(nR)],
        "historial": res["historial"],
        # Convergencia: mejor Z por generación (el campo que espera ResultadoGenetico)
        "historial_fitness": [round(h["mejorCostoZ"], 2) for h in res["historial"]],
        "generaciones_ejecutadas": res["generacionesEjecutadas"],
        "costo_penalizado": ev["costoTotalZ"],
        "evaluacion": ev,
    }
    validos = getattr(ResultadoGenetico, "model_fields", None)
    if validos is not None:
        campos = {k: v for k, v in campos.items() if k in validos}
    return ResultadoGenetico(**campos)
