"""Punto de entrada de la API REST."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import red, exacto, genetico, sensibilidad, comparativo

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


@app.get("/api/salud")
def salud():
    return {"estado": "ok"}
