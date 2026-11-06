"""Punto de entrada de la API REST."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.routes import red, exacto, genetico, sensibilidad, comparativo, escenarios, resultados
from app.db.sesion import ErrorBaseDatos

app = FastAPI(title=settings.app_nombre, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origenes_lista,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(red.router, prefix="/api/red", tags=["Red"])
app.include_router(exacto.router, prefix="/api/exacto", tags=["Modelo exacto"])
app.include_router(genetico.router, prefix="/api/genetico", tags=["Algoritmo genético"])
app.include_router(sensibilidad.router, prefix="/api/sensibilidad", tags=["Sensibilidad"])
app.include_router(comparativo.router, prefix="/api/comparativo", tags=["Comparativo"])
app.include_router(escenarios.router, prefix="/api/escenarios", tags=["Historial de escenarios (BD)"])
app.include_router(resultados.router, prefix="/api/resultados", tags=["Resultados (BD)"])


@app.exception_handler(ErrorBaseDatos)
def error_base_datos(_: Request, e: ErrorBaseDatos):
    """Errores de la base de datos -> respuesta JSON con el mensaje de PostgreSQL."""
    return JSONResponse(status_code=e.codigo_http, content={"detail": e.mensaje})


@app.get("/api/salud")
def salud():
    return {"estado": "ok"}
