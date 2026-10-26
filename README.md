# EcoResiduos del Llano — Sistema de Optimización Logística

Proyecto final de **Optimización (2026-II), Universidad de los Llanos**.

Sistema web para minimizar el costo de transporte de residuos agropecuarios desde
**10 agroempresas** hacia **4 plantas** (Villavicencio, Restrepo, Granada y Puerto Gaitán),
comparando un **modelo exacto** (programación lineal / transporte) con un **Algoritmo Genético**,
e incluyendo **análisis de sensibilidad** y **reporte comparativo**.

## Arquitectura

```
Navegador (React + Vite)  ──HTTP/JSON──►  API REST (FastAPI, Python)
   parametrización                          ├── services/exacto        (PuLP / SciPy)
   visualización de red                     ├── services/genetico      (AG propio)
   gráficas y reportes                      ├── services/sensibilidad  (escenarios, duales)
                                            └── services/comparativo   (gap, tiempos)
```

## Estructura del repositorio

```
ecoresiduos-optimizacion/
├── contexto/            Enunciado y material de referencia del curso
├── docs/                Informe IEEE, diagramas, formulación matemática
├── backend/             API REST + módulos de optimización (Python)
│   ├── app/
│   │   ├── main.py      Punto de entrada FastAPI
│   │   ├── core/        Configuración global
│   │   ├── models/      Entidades del dominio (red, nodos, arcos)
│   │   ├── schemas/     Contratos de entrada/salida de la API (Pydantic)
│   │   ├── api/routes/  Endpoints, uno por módulo
│   │   └── services/    Lógica de negocio, un paquete por módulo
│   ├── data/escenarios/ Datos de prueba (JSON)
│   └── tests/           Pruebas unitarias (pytest)
└── frontend/            Interfaz web (React + Vite)
    └── src/
        ├── api/         Cliente HTTP hacia el backend
        ├── pages/       Una página por módulo
        ├── components/  Componentes reutilizables (matrices, grafo, gráficas)
        ├── hooks/       Lógica de estado reutilizable
        ├── utils/       Formateadores y helpers
        └── styles/      Estilos globales
```

## Módulos y responsables

| Módulo | Backend | Frontend | Rol |
|---|---|---|---|
| Red / parametrización | `services/red`, `routes/red.py` | `pages/Parametrizacion` | 1 y 4 |
| Exacto | `services/exacto` | `pages/Exacto` | 2 |
| Genético | `services/genetico` | `pages/Genetico` | 3 |
| Sensibilidad | `services/sensibilidad` | `pages/Sensibilidad` | 2 y 4 |
| Comparativo | `services/comparativo` | `pages/Comparativo` | 4 |

## Cómo ejecutar

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate   |   Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API en http://localhost:8000 — documentación interactiva en http://localhost:8000/docs

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Interfaz en http://localhost:5173

### Pruebas
```bash
cd backend
pytest
```

## Flujo de trabajo en Git

Ver [CONTRIBUTING.md](CONTRIBUTING.md).
