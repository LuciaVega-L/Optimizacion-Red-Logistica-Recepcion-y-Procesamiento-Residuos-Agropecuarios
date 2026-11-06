class EvaluadorFitness:

    def __init__(self, datosRed: dict):
        
        parametrosGlobales = datosRed.get("parametros_globales", {})
        self.costoKmTon = float(parametrosGlobales.get("costo_transporte_km_ton", 1200.0))
        
        self.plantas = datosRed.get("plantas", [])
        self.agroempresas = datosRed.get("agroempresas", [])
        self.matrizDistancias = datosRed.get("matriz_distancias_km", {})

        penalizaciones = datosRed.get("penalizaciones", {})
        self.lambdaOferta = float(penalizaciones.get("factorPlanta", 1000.0))
        self.lambdaDemanda = float(penalizaciones.get("factorDemanda", 1000.0))

    def _calcularCostos(self, cromosoma: list) -> tuple:
        costoTransporte = 0.0
        costoOperativo = 0.0
        
        for i, empresa in enumerate(self.agroempresas):
            idEmpresa = empresa.get("id")
            for j, planta in enumerate(self.plantas):
                idPlanta = planta.get("id")
                
                flujo = float(cromosoma[i][j])
                distancia = float(self.matrizDistancias.get(idEmpresa, {}).get(idPlanta, 0.0))
                
                costoTransporte += flujo * distancia * self.costoKmTon
                
                costoPlantaTon = float(planta.get("costo_operativo_ton", 0.0))
                costoOperativo += flujo * costoPlantaTon

        return costoTransporte, costoOperativo

    def _calcularPenalizacionOferta(self, cromosoma: list) -> float:
        sumaExcesosCuadraticos = 0.0
        for i, empresa in enumerate(self.agroempresas):
            envioTotal = sum(float(cromosoma[i][j]) for j in range(len(self.plantas)))
            ofertaDisponible = float(empresa.get("oferta_ton_sem", 0.0))
            
            exceso = max(0.0, envioTotal - ofertaDisponible)
            sumaExcesosCuadraticos += exceso ** 2

        return self.lambdaOferta * sumaExcesosCuadraticos

    def _calcularPenalizacionDemanda(self, cromosoma: list) -> float:
        sumaExcesosCuadraticos = 0.0
        numEmpresas = len(self.agroempresas)
        
        for j, planta in enumerate(self.plantas):
            recibidoTotal = sum(float(cromosoma[i][j]) for i in range(numEmpresas))
            capacidadMaxima = float(planta.get("capacidad_maxima_ton_sem", 0.0))
            
            exceso = max(0.0, recibidoTotal - capacidadMaxima)
            sumaExcesosCuadraticos += exceso ** 2

        return self.lambdaDemanda * sumaExcesosCuadraticos

    def evaluarIndividuo(self, cromosoma: list) -> dict:
        costoTransporte, costoOperativo = self._calcularCostos(cromosoma)
        penalizacionOferta = self._calcularPenalizacionOferta(cromosoma)
        penalizacionDemanda = self._calcularPenalizacionDemanda(cromosoma)

        costoTotalZ = costoTransporte + costoOperativo + penalizacionOferta + penalizacionDemanda
        fitness = 1.0 / (1.0 + costoTotalZ)
        esFactible = (penalizacionOferta == 0.0) and (penalizacionDemanda == 0.0)

        return {
            "fitness": round(fitness, 12),
            "costoTransporte": round(costoTransporte, 2),
            "costoOperativo": round(costoOperativo, 2),
            "penalizacionOferta": round(penalizacionOferta, 2),
            "penalizacionDemanda": round(penalizacionDemanda, 2),
            "costoTotalZ": round(costoTotalZ, 2),
            "esFactible": esFactible
        }
