"""Endpoints: historial de escenarios guardados en la base de datos (guardar, consultar, clonar, borrar)."""
from fastapi import APIRouter, Depends, HTTPException

from app.api.routes.dependencias import requiere_bd
from app.schemas.persistencia import EscenarioClonar, EscenarioGuardar, EscenarioResumen, EscenarioSalida
from app.services.red import repositorio_bd as bd

router = APIRouter(dependencies=[Depends(requiere_bd)])


@router.get("", response_model=list[EscenarioResumen])
def historial():
    """Historial de escenarios, del más reciente al más antiguo."""
    return bd.historial_escenarios()


@router.get("/{nombre}", response_model=EscenarioSalida)
def obtener(nombre: str):
    """Escenario con sus parametros_entrada (oferta, demanda y matriz de costos)."""
    return bd.obtener_escenario(nombre)


@router.get("/{nombre}/config")
def obtener_config(nombre: str):
    """Escenario en el formato de dataConfig.json (para editarlo en la web)."""
    return bd.cargar_escenario(nombre)


@router.post("", response_model=EscenarioSalida, status_code=201)
def guardar(datos: EscenarioGuardar):
    """Guarda un escenario nuevo (o lo reemplaza con reemplazar=true)."""
    bd.guardar_escenario(datos.nombre, datos.config, datos.descripcion, reemplazar=datos.reemplazar)
    return bd.obtener_escenario(datos.nombre)


@router.post("/{nombre}/clonar", response_model=EscenarioSalida, status_code=201)
def clonar(nombre: str, datos: EscenarioClonar):
    """Copia un escenario para simular variaciones sin tocar el original."""
    bd.clonar_escenario(nombre, datos.nuevo, datos.variaciones, datos.descripcion)
    return bd.obtener_escenario(datos.nuevo)


@router.delete("/{nombre}")
def eliminar(nombre: str):
    """Borra el escenario junto con sus resultados."""
    if not bd.eliminar_escenario(nombre):
        raise HTTPException(404, f'No existe el escenario "{nombre}"')
    return {"eliminado": nombre}
