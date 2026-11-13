"""Función objetivo del AG.

Z(X) = Σ_ij c_ij·x_ij + λ_o·Σ_i max(0, Σ_j x_ij − o_i)² + λ_d·Σ_j max(0, Σ_i x_ij − d_j)²

c_ij viene de "matriz_costos", armada por el adaptador desde el modelo exacto (balancear),
así que el AG y el solver exacto optimizan EXACTAMENTE el mismo Z. c_ij ya incluye el costo
operativo de la planta.
"""

TOL_TON = 1e-6   # tolerancia de factibilidad, en toneladas de exceso


class EvaluadorFitness:

    def __init__(self, datosRed: dict):
        self.plantas = datosRed.get("plantas", [])
        self.agroempresas = datosRed.get("agroempresas", [])
        self.matrizCostos = datosRed["matriz_costos"]   # n x m, en el orden de agroempresas y plantas

        # El λ por defecto escala con el costo unitario máximo, para que violar una
        # restricción nunca resulte "rentable" frente al ahorro de ruta.
        porDefecto = max(1000.0, max((max(f) for f in self.matrizCostos), default=0.0))
        penalizaciones = datosRed.get("penalizaciones", {})
        self.lambdaOferta = float(penalizaciones.get("factorPlanta", porDefecto))
        self.lambdaDemanda = float(penalizaciones.get("factorDemanda", porDefecto))
        self.prohibidas = {tuple(c) for c in datosRed.get("prohibidas", [])}

    # ---------- costo de rutas ----------
    def _calcularCosto(self, cromosoma: list) -> float:
        """Σ c_ij · x_ij (transporte + costo operativo de cada planta)."""
        return sum(float(cromosoma[i][j]) * float(self.matrizCostos[i][j])
                   for i in range(len(self.agroempresas)) for j in range(len(self.plantas)))

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

    # ---------- evaluación ----------
    def evaluarIndividuo(self, cromosoma: list) -> dict:
        costoRutas = self._calcularCosto(cromosoma)
        exO, exD = self._excesosOferta(cromosoma), self._excesosDemanda(cromosoma)
        penalizacionOferta = self.lambdaOferta * sum(e ** 2 for e in exO)
        penalizacionDemanda = self.lambdaDemanda * sum(e ** 2 for e in exD)

        # Toneladas por rutas deshabilitadas: la reparación las deja en 0; si quedara algo, se penaliza
        flujoProhibido = sum(float(cromosoma[i][j]) for i, j in self.prohibidas)
        penalizacionRutas = self.lambdaDemanda * flujoProhibido ** 2

        costoTotalZ = costoRutas + penalizacionOferta + penalizacionDemanda + penalizacionRutas
        fitness = 1.0 / (1.0 + costoTotalZ)
        # Factible = ninguna restricción excedida (más allá de ruido numérico).
        # Se mide en toneladas: el umbral sobre la penalización dependía de λ y de la escala de Z.
        esFactible = (sum(exO) <= TOL_TON) and (sum(exD) <= TOL_TON) and flujoProhibido <= TOL_TON

        return {
            "fitness": round(fitness, 12),
            "costoRutas": round(costoRutas, 2),
            "penalizacionOferta": round(penalizacionOferta, 2),
            "penalizacionDemanda": round(penalizacionDemanda, 2),
            "costoTotalZ": round(costoTotalZ, 2),
            "esFactible": esFactible,
        }
