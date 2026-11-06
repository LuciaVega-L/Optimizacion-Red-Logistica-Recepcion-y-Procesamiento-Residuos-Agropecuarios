import random

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
        semilla: int = None,
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

    def ejecutar(self, verbose: bool = True) -> dict:
        poblacion = self.fabrica.crearPoblacion(self.tamanoPoblacion)
        evaluaciones = self._evaluarPoblacion(poblacion)

        mejorCromosoma, mejorEval = None, None
        historial = []
        sinMejora = 0

        for gen in range(self.generaciones):
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
