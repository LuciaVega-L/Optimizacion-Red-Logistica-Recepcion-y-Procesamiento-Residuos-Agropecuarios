"""Endpoints: Ejecutar el Algoritmo Genético con parámetros ajustables."""
from fastapi import APIRouter, HTTPException

from app.schemas.red import ParametrosAG, ProblemaTransporte
from app.schemas.resultados import ResultadoGenetico
from app.services.genetico import algoritmo
from app.services.red.validacion import validar

router = APIRouter()


@router.post("/resolver", response_model=ResultadoGenetico)
def resolver(problema: ProblemaTransporte, parametros: ParametrosAG):
    errores = validar(problema)   # mismos datos inválidos que rechaza el exacto (p. ej. rutas cerradas)
    if errores:
        raise HTTPException(status_code=422, detail=" ".join(errores))
    ejecutar = getattr(algoritmo, "ejecutar", None)
    if ejecutar is None:
        raise HTTPException(status_code=501, detail=(
            "El módulo genético todavía no expone ejecutar(problema, parametros) "
            "(services/genetico/algoritmo.py, Rol 3)."))
    try:
        return ejecutar(problema, parametros)
    except NotImplementedError as e:
        raise HTTPException(status_code=501, detail=str(e) or "AG pendiente de implementación.")
