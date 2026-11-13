"""Punto de entrada de la API REST."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from app.core.config import settings
from app.api.routes import red, exacto, genetico, sensibilidad, comparativo, escenarios, resultados
from app.db.sesion import ErrorBaseDatos

app = FastAPI(title=settings.app_nombre, version="0.1.0")

# Orígenes permitidos
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origenes_lista,
    allow_origin_regex=settings.cors_regex,
    allow_credentials=True,
    allow_methods=["*"],  # Permite GET, POST, OPTIONS, etc.
    allow_headers=["*"],
)

app.include_router(red.router, prefix="/red", tags=["Red"])
app.include_router(exacto.router, prefix="/exacto", tags=["Modelo exacto"])
app.include_router(genetico.router, prefix="/genetico", tags=["Algoritmo genético"])
app.include_router(sensibilidad.router, prefix="/sensibilidad", tags=["Sensibilidad"])
app.include_router(comparativo.router, prefix="/comparativo", tags=["Comparativo"])
app.include_router(escenarios.router, prefix="/escenarios", tags=["Historial de escenarios (BD)"])
app.include_router(resultados.router, prefix="/resultados", tags=["Resultados (BD)"])


@app.exception_handler(ErrorBaseDatos)
def error_base_datos(_: Request, e: ErrorBaseDatos):
    return JSONResponse(status_code=e.codigo_http, content={"detail": e.mensaje})


@app.get("/salud")
def salud():
    return {"estado": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)