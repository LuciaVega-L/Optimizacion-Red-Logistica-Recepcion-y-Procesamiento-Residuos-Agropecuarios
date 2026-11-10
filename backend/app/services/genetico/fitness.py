"""Función objetivo del AG.

Z(X) = Σ_ij c_ij·x_ij + λ_o·Σ_i max(0, Σ_j x_ij − o_i)² + λ_d·Σ_j max(0, Σ_i x_ij − d_j)²

Dos modos de datos (la fórmula es la misma):

* Modo matriz  ("matriz_costos" presente): c_ij viene directamente del modelo exacto
  (balancear(problema)), de modo que AG y solver exacto optimizan EXACTAMENTE el mismo Z.
* Modo legado (sin "matriz_costos"): c_ij = distancia_ij · costo_km_ton + costo_operativo_j.
"""

TOL_TON = 1e-6   # tolerancia de factibilidad, en toneladas de exceso


class EvaluadorFitness:

    def __init__(self, datosRed: dict):
        parametrosGlobales = datosRed.get("parametros_globales", {})
        self.costoKmTon = float(parametrosGlobales.get("costo_transporte_km_ton", 1200.0))

        self.plantas = datosRed.get("plantas", [])
        self.agroempresas = datosRed.get("agroempresas", [])
        self.matrizDistancias = datosRed.get("matriz_distancias_km", {})
        self.matrizCostos = datosRed.get("matriz_costos")   # n x m, o None

        # En modo matriz el λ por defecto escala con el costo unitario máximo, para que
        # violar una restricción nunca resulte "rentable" frente al ahorro de ruta.
        porDefecto = 1000.0
        if self.matrizCostos:
            porDefecto = max(1000.0, max(max(f) for f in self.matrizCostos))
        penalizaciones = datosRed.get("penalizaciones", {})
        self.lambdaOferta = float(penalizaciones.get("factorPlanta", porDefecto))
        self.lambdaDemanda = float(penalizaciones.get("factorDemanda", porDefecto))

    # ---------- costo de rutas ----------
    def costoUnitario(self, i: int, j: int) -> float:
        """c_ij por tonelada."""
        if self.matrizCostos:
            return float(self.matrizCostos[i][j])
        idE = self.agroempresas[i].get("id")
        idP = self.plantas[j].get("id")
        d = float(self.matrizDistancias.get(idE, {}).get(idP, 0.0))
        return d * self.costoKmTon + float(self.plantas[j].get("costo_operativo_ton", 0.0))

    def _calcularCostos(self, cromosoma: list) -> tuple:
        costoTransporte = 0.0
        costoOperativo = 0.0
        for i, empresa in enumerate(self.agroempresas):
            for j, planta in enumerate(self.plantas):
                flujo = float(cromosoma[i][j])
                if self.matrizCostos:
                    costoTransporte += flujo * float(self.matrizCostos[i][j])
                else:
                    idE, idP = empresa.get("id"), planta.get("id")
                    d = float(self.matrizDistancias.get(idE, {}).get(idP, 0.0))
                    costoTransporte += flujo * d * self.costoKmTon
                    costoOperativo += flujo * float(planta.get("costo_operativo_ton", 0.0))
        return costoTransporte, costoOperativo

    # ---------- excesos (en toneladas) ----------
    def _excesosOferta(self, cromosoma: list) -> list:
        out = []
        for i, empresa in enumerate(self.agroempresas):
            envio = sum(float(cromosoma[i][j]) for j in range(len(self.plantas)))
            out.append(max(0.0, envio - float(empresa.get("oferta_ton_sem", 0.0))))
        return out

    def _excesosDemanda(self, cromosoma: list) -> list:
        out = []
        n = len(self.agroempresas)
        for j, planta in enumerate(self.plantas):
            recibido = sum(float(cromosoma[i][j]) for i in range(n))
            out.append(max(0.0, recibido - float(planta.get("capacidad_maxima_ton_sem", 0.0))))
        return out

    def _calcularPenalizacionOferta(self, cromosoma: list) -> float:
        return self.lambdaOferta * sum(e ** 2 for e in self._excesosOferta(cromosoma))

    def _calcularPenalizacionDemanda(self, cromosoma: list) -> float:
        return self.lambdaDemanda * sum(e ** 2 for e in self._excesosDemanda(cromosoma))

    # ---------- evaluación ----------
    def evaluarIndividuo(self, cromosoma: list) -> dict:
        costoTransporte, costoOperativo = self._calcularCostos(cromosoma)
        exO, exD = self._excesosOferta(cromosoma), self._excesosDemanda(cromosoma)
        penalizacionOferta = self.lambdaOferta * sum(e ** 2 for e in exO)
        penalizacionDemanda = self.lambdaDemanda * sum(e ** 2 for e in exD)

        costoTotalZ = costoTransporte + costoOperativo + penalizacionOferta + penalizacionDemanda
        fitness = 1.0 / (1.0 + costoTotalZ)
        # Factible = ninguna restricción excedida (más allá de ruido numérico).
        # Se mide en toneladas: el umbral sobre la penalización dependía de λ y de la escala de Z.
        esFactible = (sum(exO) <= TOL_TON) and (sum(exD) <= TOL_TON)

        return {
            "fitness": round(fitness, 12),
            "costoTransporte": round(costoTransporte, 2),
            "costoOperativo": round(costoOperativo, 2),
            "penalizacionOferta": round(penalizacionOferta, 2),
            "penalizacionDemanda": round(penalizacionDemanda, 2),
            "costoTotalZ": round(costoTotalZ, 2),
            "esFactible": esFactible,
        }
