"""Lectura y escritura de escenarios en backend/data/escenarios/."""
import json
from pathlib import Path

DIR_ESCENARIOS = Path(__file__).resolve().parents[3] / "data" / "escenarios"


def listar_escenarios() -> list[str]:
    return sorted(p.stem for p in DIR_ESCENARIOS.glob("*.json"))


def cargar_escenario(nombre: str) -> dict:
    with open(DIR_ESCENARIOS / f"{nombre}.json", encoding="utf-8") as f:
        return json.load(f)
