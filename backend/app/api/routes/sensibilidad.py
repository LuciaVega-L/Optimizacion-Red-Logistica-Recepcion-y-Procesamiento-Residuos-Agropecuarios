"""Endpoints: Simular escenarios y obtener precios sombra y rangos."""
from fastapi import APIRouter

from app.schemas.red import Escenario, ProblemaTransporte
from app.services.sensibilidad import analisis

router = APIRouter()


@router.post("/simular")
def simular(problema: ProblemaTransporte, escenarios: list[Escenario]):
    return analisis.simular(problema, escenarios)
