import random


class FabricaCromosomas:
    """Cromosoma = matriz X (empresas x plantas) de toneladas/semana, con Σ_j x_ij = oferta_i.

    Operador de reparación: (1) no negatividad y reescalado de filas a su oferta;
    (2) reparación de capacidad: el exceso de una planta se reubica, fila por fila, en las
    plantas con holgura (más baratas primero). Conserva Σ_j x_ij = oferta_i, y como en el
    modelo balanceado Σ oferta = Σ capacidad siempre existe una solución factible.
    """

    def __init__(self, datosRed: dict, generador: random.Random = None):
        self.agroempresas = datosRed.get("agroempresas", [])
        self.plantas = datosRed.get("plantas", [])
        self.matrizDistancias = datosRed.get("matriz_distancias_km", {})
        self.matrizCostos = datosRed.get("matriz_costos")   # modo matriz (opcional)
        self.rng = generador or random.Random()

        self.numEmpresas = len(self.agroempresas)
        self.numPlantas = len(self.plantas)
        self.ofertas = [float(e.get("oferta_ton_sem", 0.0)) for e in self.agroempresas]
        self.capacidades = [float(p.get("capacidad_maxima_ton_sem", 0.0)) for p in self.plantas]

    # ---------- utilidades ----------
    @staticmethod
    def copiar(cromosoma: list) -> list:
        return [fila[:] for fila in cromosoma]

    def _distancia(self, i: int, j: int) -> float:
        idE = self.agroempresas[i].get("id")
        idP = self.plantas[j].get("id")
        return float(self.matrizDistancias.get(idE, {}).get(idP, 1.0))

    def _costoRuta(self, i: int, j: int) -> float:
        if self.matrizCostos:
            return float(self.matrizCostos[i][j])
        return self._distancia(i, j)

    def _escalarFila(self, pesos: list, oferta: float) -> list:
        total = sum(pesos)
        if total <= 0.0:
            return [oferta / len(pesos)] * len(pesos)
        return [oferta * p / total for p in pesos]

    def _repararCapacidad(self, cromosoma: list, iteraciones: int = 10) -> None:
        for _ in range(iteraciones):
            cargas = [sum(cromosoma[i][j] for i in range(self.numEmpresas))
                      for j in range(self.numPlantas)]
            excesos = [max(0.0, cargas[j] - self.capacidades[j]) for j in range(self.numPlantas)]
            if max(excesos, default=0.0) <= 1e-9:
                return
            holguras = [max(0.0, self.capacidades[j] - cargas[j]) for j in range(self.numPlantas)]

            # 1) retirar el exceso de cada planta saturada, proporcional a lo que aporta cada fila
            retirado = [0.0] * self.numEmpresas
            for j in range(self.numPlantas):
                if excesos[j] > 1e-9 and cargas[j] > 0.0:
                    f = excesos[j] / cargas[j]
                    for i in range(self.numEmpresas):
                        q = cromosoma[i][j] * f
                        cromosoma[i][j] -= q
                        retirado[i] += q

            # 2) reubicar en plantas con holgura, la más barata primero
            filas = list(range(self.numEmpresas))
            self.rng.shuffle(filas)
            for i in filas:
                restante = retirado[i]
                if restante <= 1e-12:
                    continue
                destinos = sorted((j for j in range(self.numPlantas) if holguras[j] > 1e-12),
                                  key=lambda j: self._costoRuta(i, j))
                for j in destinos:
                    q = min(restante, holguras[j])
                    cromosoma[i][j] += q
                    holguras[j] -= q
                    restante -= q
                    if restante <= 1e-12:
                        break
                if restante > 1e-12:   # sin holgura global (red no balanceada): lo absorbe la penalización
                    jBarata = min(range(self.numPlantas), key=lambda j: self._costoRuta(i, j))
                    cromosoma[i][jBarata] += restante

    def reparar(self, cromosoma: list) -> list:
        """No negatividad, filas = oferta y capacidades respetadas."""
        for i in range(self.numEmpresas):
            fila = [max(0.0, x) for x in cromosoma[i]]
            cromosoma[i] = self._escalarFila(fila, self.ofertas[i])
        self._repararCapacidad(cromosoma)
        return cromosoma

    # ---------- generadores de individuos ----------
    def crearAleatorio(self) -> list:
        return [
            self._escalarFila([self.rng.random() for _ in range(self.numPlantas)], self.ofertas[i])
            for i in range(self.numEmpresas)
        ]

    def crearSesgado(self) -> list:
        """Reparte más hacia las plantas baratas/cercanas (peso ~ 1/(c+1)^k, k aleatorio)."""
        cromosoma = []
        for i in range(self.numEmpresas):
            exponente = self.rng.uniform(1.0, 4.0)
            costos = [self._costoRuta(i, j) for j in range(self.numPlantas)]
            # normaliza por el mínimo para que el sesgo no dependa de la escala de los costos
            ref = max(min(costos), 1e-9)
            pesos = [1.0 / ((c / ref) ** exponente) if c > 0 else 1.0 for c in costos] \
                if self.matrizCostos else \
                [1.0 / ((c + 1.0) ** exponente) for c in costos]
            cromosoma.append(self._escalarFila(pesos, self.ofertas[i]))
        return cromosoma

    def crearPoblacion(self, tamano: int, proporcionSesgada: float = 0.3) -> list:
        numSesgados = int(tamano * proporcionSesgada)
        poblacion = [self.crearSesgado() for _ in range(numSesgados)]
        poblacion += [self.crearAleatorio() for _ in range(tamano - numSesgados)]
        return [self.reparar(ind) for ind in poblacion]   # población inicial ya factible
