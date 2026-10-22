# 🌱 EcoResiduos del Llano: Optimización de la Red Logística de Residuos Agropecuarios

> Optimización de la red logística de recepción y procesamiento de residuos agropecuarios mediante **modelos de redes / transporte (método exacto)** y **Algoritmos Genéticos**, con interfaz interactiva y análisis de sensibilidad.

**Universidad de los Llanos** · Facultad de Ciencias Básicas e Ingeniería · Programa de Ingeniería de Sistemas
**Asignatura:** Optimización · **Periodo:** 2026-II · **Proyecto Final de Curso**

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Status](https://img.shields.io/badge/status-en%20desarrollo-yellow)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 📑 Tabla de contenido

1. [Descripción del problema](#-descripción-del-problema)
2. [Objetivos](#-objetivos)
3. [Características principales](#-características-principales)
4. [Análisis de sensibilidad](#-análisis-de-sensibilidad)
5. [Instalación](#-instalación)
---

## 🧭 Descripción del problema

**EcoResiduos del Llano S.A.S.** valoriza residuos agropecuarios del departamento del Meta (biomasa de palma, arroz, ganadería y plantaciones forestales) transformándolos en abonos orgánicos, biocombustibles y suplementos para nutrición animal.

La red actual está compuesta por:

| Componente | Cantidad | Detalle |
|---|---|---|
| **Fuentes** (empresas agropecuarias aliadas) | 10 | Generan un volumen semanal constante de residuos (toneladas) |
| **Destinos** (plantas de recepción y transformación) | 4 | Villavicencio, Restrepo, Granada y Puerto Gaitán |

La asignación empírica de rutas genera **sobrecostos operativos**. Este proyecto construye un sistema informático que **minimiza el costo total de transporte** y determina la **distribución óptima de flujos** de residuos en la red, permitiendo además ampliar el número de empresas y sedes, y modificar los coeficientes del modelo de negocio.

---

## 🎯 Objetivos

**Objetivo general:** diseñar y desarrollar una solución computacional basada en optimización de redes, métodos de transporte y algoritmos genéticos para minimizar el costo logístico de la red.

**Objetivos específicos:**

- Estructurar y parametrizar el problema de transporte / flujo en redes (oferta de 10 empresas, demanda/capacidad de 4 plantas).
- Implementar el modelo matemático exacto para hallar el **óptimo global**.
- Diseñar e implementar un **Algoritmo Genético** para obtener soluciones cuasi-óptimas.
- Realizar el **análisis de sensibilidad** (costos unitarios, oferta, demanda).
- Comparar el desempeño del método exacto vs. la metaheurística (calidad, tiempo, escalabilidad y robustez).

---

## ✨ Características principales

- 🧮 **Módulo exacto:** resuelve el problema de transporte / costo mínimo con programación lineal y valida todas las restricciones.
- 🧬 **Módulo genético:** AG personalizado con codificación de flujos, fitness penalizado, selección, cruce y mutación configurables.
- 🖥️ **Interfaz interactiva:** edición dinámica de matrices de costos, ofertas y demandas; agregar/quitar fuentes y plantas.
- 📈 **Análisis de sensibilidad:** precios sombra (duales), rangos de estabilidad de la base óptima y simulación de escenarios.
- 📊 **Reporte comparativo:** costo, tiempo de ejecución, *gap* (%) y comportamiento bajo cada escenario.
- 🗺️ **Visualización** de la red y de los flujos óptimos.

---

## 📈 Análisis de sensibilidad

El módulo permite simular escenarios y observar su efecto sobre la solución:

- **Costos:** variación porcentual de combustible/transporte y del costo por tonelada.
- **Oferta:** incrementos o reducciones (%) de residuos generados por una o todas las empresas.
- **Demanda/capacidad:** cuellos de botella en una o varias plantas.

Resultados que se reportan:

- **Precios sombra (variables duales)** de las restricciones de oferta y de capacidad.
- **Rangos de variación permitidos** (en costos y lados derechos) que **no alteran la base óptima**.
- **Costos reducidos** de las rutas no utilizadas.
- Evolución de la función objetivo y de los flujos según el escenario.
- Comportamiento del **AG** ante los mismos escenarios (ver comparación).

---

**Flujo general:**

```
 Interfaz (datos / parámetros)
            │
            ▼
   Modelo de red (network.py) ──► Validación
       │                │
       ▼                ▼
 Solver exacto     Algoritmo Genético
       │                │
       └───────┬────────┘
               ▼
   Análisis de sensibilidad + Reporte comparativo
               ▼
        Visualización / Exportación
```

---

## ⚙️ Instalación

**Requisitos:** Python 3.10 o superior y `git`.

```bash
# 1. Clonar el repositorio
git clone https://github.com/<usuario>/ecoresiduos-llano.git
cd ecoresiduos-llano

# 2. Crear y activar un entorno virtual
python -m venv .venv
source .venv/bin/activate        # Linux / macOS
# .venv\Scripts\activate         # Windows

# 3. Instalar dependencias
pip install -r requirements.txt
```

**Dependencias sugeridas (`requirements.txt`):**

```
numpy
pandas
scipy          # linprog (HiGHS) para el modelo exacto y duales
pulp           # alternativa de modelado LP
matplotlib
plotly
networkx       # grafo y visualización de la red
streamlit      # interfaz (puede sustituirse por Tkinter/PyQt)
pytest
```

---

<p align="center">Hecho con 💚 en el Llano · Universidad de los Llanos · 2026-II</p>
