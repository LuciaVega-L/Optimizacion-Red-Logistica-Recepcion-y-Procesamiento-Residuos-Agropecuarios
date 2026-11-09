"""Endpoints: Resolver el modelo de transporte con el solucionador exacto."""
from fastapi import APIRouter, HTTPException

from app.schemas.red import ProblemaTransporte
from app.schemas.resultados import ResultadoExacto
from app.services.exacto import solver

router = APIRouter()


@router.post("/resolver", response_model=ResultadoExacto)
def resolver(problema: ProblemaTransporte, costo_no_procesado: float = 0.0):
    try:
        return solver.resolver(problema, costo_no_procesado)
    except solver.ProblemaInvalido as e:
        raise HTTPException(status_code=422, detail=str(e))
