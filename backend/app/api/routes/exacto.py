"""Endpoints: Resolver el modelo de transporte con el solucionador exacto."""
from fastapi import APIRouter

from app.schemas.red import ProblemaTransporte
from app.schemas.resultados import ResultadoExacto
from app.services.exacto import solver

router = APIRouter()


@router.post("/resolver", response_model=ResultadoExacto)
def resolver(problema: ProblemaTransporte):
    return solver.resolver(problema)
