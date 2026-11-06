import random


class FabricaCromosomas:
    
    def __init__(self, datosRed: dict, generador: random.Random = None):
        self.agroempresas = datosRed.get("agroempresas", [])
        self.plantas = datosRed.get("plantas", [])
        self.matrizDistancias = datosRed.get("matriz_distancias_km", {})
        self.rng = generador or random.Random()

        self.numEmpresas = len(self.agroempresas)
        self.numPlantas = len(self.plantas)
        self.ofertas = [float(e.get("oferta_ton_sem", 0.0)) for e in self.agroempresas]

    # ---------- utilidades ----------
    @staticmethod
    def copiar(cromosoma: list) -> list:
        return [fila[:] for fila in cromosoma]

    def _escalarFila(self, pesos: list, oferta: float) -> list:
        total = sum(pesos)
        if total <= 0.0:
            return [oferta / len(pesos)] * len(pesos)
        return [oferta * p / total for p in pesos]

    def reparar(self, cromosoma: list) -> list:
        """Elimina negativos y reescala cada fila para que sume su oferta."""
        for i in range(self.numEmpresas):
            fila = [max(0.0, x) for x in cromosoma[i]]
            cromosoma[i] = self._escalarFila(fila, self.ofertas[i])
        return cromosoma

    # ---------- generadores de individuos ----------
    def crearAleatorio(self) -> list:
        return [
            self._escalarFila([self.rng.random() for _ in range(self.numPlantas)], self.ofertas[i])
            for i in range(self.numEmpresas)
        ]

    def crearSesgado(self) -> list:
        """Reparte más hacia las plantas cercanas (peso ~ 1/distancia^k, k aleatorio)."""
        cromosoma = []
        for i, empresa in enumerate(self.agroempresas):
            idEmpresa = empresa.get("id")
            exponente = self.rng.uniform(1.0, 4.0)
            pesos = []
            for planta in self.plantas:
                d = float(self.matrizDistancias.get(idEmpresa, {}).get(planta.get("id"), 1.0))
                pesos.append(1.0 / ((d + 1.0) ** exponente))
            cromosoma.append(self._escalarFila(pesos, self.ofertas[i]))
        return cromosoma

    def crearPoblacion(self, tamano: int, proporcionSesgada: float = 0.3) -> list:
        numSesgados = int(tamano * proporcionSesgada)
        poblacion = [self.crearSesgado() for _ in range(numSesgados)]
        poblacion += [self.crearAleatorio() for _ in range(tamano - numSesgados)]
        return poblacion
