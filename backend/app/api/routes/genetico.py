"""Endpoints: Ejecutar el Algoritmo Genético con parámetros ajustables."""
from fastapi import APIRouter

from app.schemas.red import ParametrosAG, ProblemaTransporte
from app.schemas.resultados import ResultadoGenetico
from app.services.genetico import algoritmo

router = APIRouter()


@router.post("/resolver", response_model=ResultadoGenetico)
def resolver(problema: ProblemaTransporte, parametros: ParametrosAG):
    return algoritmo.ejecutar(problema, parametros)
