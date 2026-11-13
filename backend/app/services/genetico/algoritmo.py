
import random
import time

from .fitness import EvaluadorFitness
from .cromosoma import FabricaCromosomas
from . import operadores as ops

TAM_TORNEO = 3   # individuos que compiten en cada torneo
NUM_ELITES = 2   # mejores individuos que pasan sin cambios a la siguiente generación


class AlgoritmoGenetico:

    def __init__(
        self,
        datosRed: dict,
        tamanoPoblacion: int = 100,
        generaciones: int = 500,
        probCruce: float = 0.8,
        probMutacion: float = 0.05,
        tamTorneo: int = TAM_TORNEO,
        seleccion: str = "torneo",   # "torneo" | "ruleta"
        cruce: str = "un_punto",     # "un_punto" | "dos_puntos"
        numElites: int = NUM_ELITES,
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

        self.rng = random.Random(semilla)
        self.evaluador = EvaluadorFitness(datosRed)
        self.fabrica = FabricaCromosomas(datosRed, self.rng)

    def _evaluarPoblacion(self, poblacion: list) -> list:
        return [self.evaluador.evaluarIndividuo(ind) for ind in poblacion]

    def _seleccionar(self, poblacion, aptitudes):
        if self.seleccion == "ruleta":
            return ops.seleccion_ruleta(poblacion, aptitudes, self.rng)
        return ops.seleccion_torneo(poblacion, aptitudes, self.tamTorneo, self.rng)

    def _nuevaGeneracion(self, poblacion: list, orden: list, aptitudes: list) -> list:
        """Élites + hijos obtenidos por selección, cruce, mutación y reparación."""
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
        return nueva

    def ejecutar(self, verbose: bool = False) -> dict:
        poblacion = self.fabrica.crearPoblacion(self.tamanoPoblacion)
        evaluaciones = self._evaluarPoblacion(poblacion)

        mejorCromosoma, mejorEval = None, None
        historial = []

        for gen in range(self.generaciones + 1):
            # Se ordena por costoTotalZ (menor = mejor): evita los empates por 1/(1+Z) con Z del orden de 1e8.
            orden = sorted(range(len(poblacion)), key=lambda k: evaluaciones[k]["costoTotalZ"])
            idxMejor = orden[0]

            if mejorEval is None or evaluaciones[idxMejor]["costoTotalZ"] < mejorEval["costoTotalZ"] - 1e-6:
                mejorCromosoma = FabricaCromosomas.copiar(poblacion[idxMejor])
                mejorEval = dict(evaluaciones[idxMejor])

            costos = [e["costoTotalZ"] for e in evaluaciones]
            historial.append({
                "generacion": gen,
                "mejorCostoZ": mejorEval["costoTotalZ"],
                "promedioCostoZ": sum(costos) / len(costos),
                "porcentajeFactibles": 100.0 * sum(e["esFactible"] for e in evaluaciones) / len(evaluaciones),
            })
            if verbose and (gen % 25 == 0 or gen == self.generaciones):
                print(f"Gen {gen:4d} | mejor Z = {mejorEval['costoTotalZ']:,.2f} | "
                      f"factible = {mejorEval['esFactible']}")

            # Criterio de parada
            if gen == self.generaciones:
                break

            aptitudes = [1.0 / (1.0 + c) for c in costos]
            poblacion = self._nuevaGeneracion(poblacion, orden, aptitudes)
            evaluaciones = self._evaluarPoblacion(poblacion)

        return {
            "mejorCromosoma": mejorCromosoma,
            "evaluacion": mejorEval,
            "historial": historial,
            "asignacion": self.resumenAsignacion(mejorCromosoma),
        }

    def resumenAsignacion(self, cromosoma: list, umbral: float = 0.01) -> list:
        """Lista legible: empresa -> planta -> toneladas/semana."""
        resumen = []
        for i, empresa in enumerate(self.fabrica.agroempresas):
            for j, planta in enumerate(self.fabrica.plantas):
                ton = cromosoma[i][j]
                if ton > umbral:
                    resumen.append({
                        "agroempresa": empresa.get("nombre"),
                        "planta": planta.get("nombre"),
                        "toneladas": round(ton, 2),
                    })
        return resumen


#  adaptador

def _kwargs_desde_parametros(parametros) -> dict:
    
    return {
        "tamanoPoblacion": parametros.poblacion,
        "generaciones": parametros.generaciones,
        "probCruce": parametros.tasa_cruce,
        "probMutacion": parametros.tasa_mutacion,
        "seleccion": parametros.seleccion,
        "cruce": parametros.tipo_cruce,
        "semilla": parametros.semilla,
    }


def _datos_desde_problema(problema) -> dict:
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

    return ResultadoGenetico(
        metodo="genetico",
        costo_total=round(costo_real, 2),
        tiempo_s=round(tiempo, 4),
        factible=bool(ev["esFactible"]),
        asignacion=[[round(cromo[i][j], 4) for j in range(mR)] for i in range(nR)],
        # Convergencia: mejor Z en cada generación, desde la 0 (población inicial) hasta la última
        historial_fitness=[round(h["mejorCostoZ"], 2) for h in res["historial"]],
    )
