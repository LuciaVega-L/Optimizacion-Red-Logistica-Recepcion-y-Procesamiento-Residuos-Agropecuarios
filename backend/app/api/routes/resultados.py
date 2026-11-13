"""Endpoints: guardar cada ejecución (Exacto / Genético) y consultar el historial para el comparativo."""
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.routes.dependencias import requiere_bd
from app.schemas.persistencia import ComparativoFila, ResultadoGuardar, ResultadoSalida
from app.services.red import repositorio_bd as bd

router = APIRouter(dependencies=[Depends(requiere_bd)])


@router.post("", response_model=ResultadoSalida, status_code=201)
def guardar(datos: ResultadoGuardar):
    """Guarda una ejecución. La base calcula el gap y el desglose transporte/operación."""
    campos = datos.model_dump(exclude={"matriz_flujos"})
    return bd.guardar_resultado(matriz_flujos=datos.matriz_flujos, **campos)


@router.get("", response_model=list[ResultadoSalida])
def historial(
    escenario: str | None = Query(None, description="Nombre del escenario"),
    algoritmo: str | None = Query(None, description="Exacto o Genético"),
    limite: int = Query(50, ge=1, le=500),
    incluir_matriz: bool = Query(False, description="Incluir matriz_flujos_json en cada fila"),
):
    """Historial de resultados, del más reciente al más antiguo."""
    return bd.listar_resultados(escenario, algoritmo, limite, incluir_matriz)


@router.get("/comparativo", response_model=list[ComparativoFila])
def comparativo(escenario: str | None = Query(None)):
    """Último Exacto vs. último Genético de cada escenario: costo, tiempo (ms) y gap (%)."""
    return bd.historial_comparativo(escenario)


@router.get("/{id_resultado}", response_model=ResultadoSalida)
def obtener(id_resultado: str):
    """Un resultado con su matriz de flujos, precios sombra e historial de fitness."""
    res = bd.obtener_resultado(id_resultado)
    if res is None:
        raise HTTPException(404, "No existe ese resultado")
    return res
