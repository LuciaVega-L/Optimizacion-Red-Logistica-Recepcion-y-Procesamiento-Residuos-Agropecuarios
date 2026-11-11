# Base de datos PostgreSQL (Supabase) — guía paso a paso

Base de datos para guardar las simulaciones del sistema de optimización de
EcoResiduos del Llano S.A.S.

```
Web UI (React)  ──HTTP──►  FastAPI  ──SQLAlchemy (ORM)──►  PostgreSQL en Supabase
                              │
                              └─ con FUENTE_DATOS=json sigue usando data/escenarios/*.json
```

## Cómo se cumple el requerimiento

| Requerimiento | Dónde está |
|---|---|
| Tabla **Escenarios**: id, nombre, fecha, parámetros de entrada (oferta, demanda, costos) | `escenarios.id`, `nombre`, `fecha`, `parametros_entrada` (JSON con `oferta`, `demanda`, `costos` cᵢⱼ, `distancias_km`...) |
| Tabla **Resultados**: id, escenario_id, algoritmo_utilizado ("Exacto" \| "Genético"), costo_total, tiempo_ejecucion_ms, gap_desviacion, matriz_flujos_json | Tabla `resultados` con esas mismas columnas |
| Conexión / ORM en Python | `app/db/sesion.py` (conexión) y `app/db/modelos.py` (modelos `Escenario`, `Resultado`, ...) con SQLAlchemy 2.0 |
| Consultar y almacenar desde la Web UI | Endpoints `/escenarios` y `/resultados` + `frontend/src/api/historial.js` |
| Guardar una ejecución y recuperar el historial para el análisis comparativo | `POST /resultados`, `GET /resultados`, `GET /escenarios`, `GET /resultados/comparativo` (probado en `tests/test_bd.py`) |

### Tabla `escenarios`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador |
| `nombre` | text, único | Nombre del escenario (p. ej. `dataConfig`, `Costos +10%`) |
| `fecha` | timestamptz | Fecha de creación |
| `parametros_entrada` | jsonb | `{"fuentes", "plantas", "oferta", "demanda", "costos", "distancias_km", "costo_operativo", "costo_transporte_km_ton", "oferta_total", "capacidad_total"}` |
| `descripcion`, `es_base`, `costo_transporte_km_ton`, `variaciones`, `escenario_origen_id` | | Datos adicionales |

`parametros_entrada` **se calcula solo** a partir de las tablas `agroempresas`, `plantas` y
`rutas`, así que nunca queda desactualizado. Se edita la red, no el JSON.

### Tabla `resultados`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid | Identificador |
| `escenario_id` | uuid → escenarios | Escenario resuelto |
| `algoritmo_utilizado` | text | `'Exacto'` o `'Genético'` |
| `costo_total` | numeric | Z (COP/semana) |
| `tiempo_ejecucion_ms` | double | Tiempo de cómputo en milisegundos |
| `gap_desviacion` | numeric | % = (Z_AG − Z_exacto) / Z_exacto × 100. Es 0 para Exacto. **Lo calcula la base** contra el último Exacto del mismo escenario. |
| `matriz_flujos_json` | jsonb | `{"agroempresas": ["E01", ...], "plantas": ["P1", ...], "toneladas": [[...]]}` |
| `costo_transporte`, `costo_operativo` | numeric | Desglose de Z (lo calcula la base) |
| `factible`, `parametros_algoritmo`, `historial_fitness`, `resultado_exacto_id` | | Datos adicionales para el informe |

Tablas de apoyo: `agroempresas`, `plantas` y `rutas` guardan la red editable G = (V, E), y
`precios_sombra` guarda los duales de cada resultado exacto.

---

## Paso 1. Instalar los archivos en el repo

Copien `instalar_bd.py` en la **carpeta general del repo** (donde están `backend/` y
`frontend/`) y ejecútenlo:

```powershell
cd C:\Users\Lenovo\Documents\GitHub\Optimizacion-Red-Logistica-Recepcion-y-Procesamiento-Residuos-Agropecuarios
python instalar_bd.py
```

El instalador crea o actualiza todos los archivos, borra los de la versión anterior con
`supabase-py` y guarda una copia `*.antes_bd.bak` de cada archivo que reemplaza. Al final
muestra la lista de lo que hizo. Revisen que todo esté bien, borren los `.bak` y luego
borren `instalar_bd.py`.

## Paso 2. Crear las tablas en Supabase

En Supabase: **SQL Editor → New query**.

1. **Solo esta vez**, porque ya existían tablas de la versión anterior: abran
   `supabase/reiniciar_base_datos.sql`, copien todo, péguenlo y den **Run**.
   Si Supabase avisa de "operaciones destructivas", acepten: borra las tablas viejas.
2. En otra consulta, peguen `supabase/crear_base_datos_ecoresiduos.sql` completo y den **Run**.
   Debe salir `Success. No rows returned`.

Comprobación en **Table Editor**: deben aparecer `escenarios`, `resultados`,
`agroempresas`, `plantas`, `rutas` y `precios_sombra`.

> `crear_base_datos_ecoresiduos.sql` se puede volver a ejecutar sin perder datos.
> `reiniciar_base_datos.sql` **borra todo**: no lo vuelvan a usar.

## Paso 3. Copiar la cadena de conexión

1. En Supabase, botón **Connect** (arriba, en la barra del proyecto).
2. Pestaña **Connection String**, tipo **URI**, método **Session pooler**.
   Usen el *Session pooler* y no el *Direct connection*, que no funciona en redes solo IPv4.
3. Copien la URI. Se ve así:
   ```
   postgresql://postgres.upfcdctfgcyncgpcbcjt:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
   ```
4. La contraseña es la que pusieron al crear el proyecto. Si no la recuerdan:
   **Project Settings → Database → Reset database password**.

## Paso 4. Configurar `backend/.env`

```env
FUENTE_DATOS=bd
DATABASE_URL=postgresql://postgres.upfcdctfgcyncgpcbcjt:[YOUR-PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
DATABASE_PASSWORD=la_contraseña_de_la_base
```

- Peguen la URI **tal cual**, con `[YOUR-PASSWORD]` incluido. La contraseña va aparte, en
  `DATABASE_PASSWORD`, y el backend la inserta solo. Así no hay que codificar caracteres como `@` o `#`.
- Las líneas viejas `SUPABASE_URL` y `SUPABASE_SECRET_KEY` ya no se usan y se pueden borrar.
- El `.env` **nunca** se sube a GitHub. El `.env.example` sí se sube, pero sin contraseña.

## Paso 5. Instalar dependencias

```powershell
cd backend
python -m pip install -r requirements.txt
```

Se agregan `sqlalchemy==2.0.57` y `psycopg2-binary==2.9.13`, y se quita `supabase`.
Si quieren desinstalarlo: `python -m pip uninstall supabase`.

## Paso 6. Cargar el caso base

```powershell
python -m scripts.sembrar_bd
```

Salida esperada:

```
  ✔ dataConfig: guardado y verificado

Historial de escenarios en la base de datos:
  dataConfig (base): 10 agroempresas, 4 plantas, 40 rutas · oferta 1540 / capacidad 1700 t/sem · capacidad_sobrante · 0 resultados
```

Si después cambian `dataConfig.json`, se recarga con `python -m scripts.sembrar_bd --reemplazar`.

## Paso 7. Probar

```powershell
python -m pytest tests/test_bd.py -v
```

Deben pasar las 5 pruebas:
- La tabla de escenarios tiene id, nombre, fecha y parámetros.
- El escenario tiene el mismo formato que `dataConfig.json`.
- Una ejecución se guarda y el historial se recupera.
- Las validaciones rechazan datos incorrectos.
- Clonar un escenario no modifica el original.

Las pruebas usan escenarios temporales y los borran al final.

## Paso 8. Probar los endpoints

```powershell
python -m uvicorn main:app --reload
```

Abran **http://localhost:8000/docs**. Ahí aparecen las secciones *Historial de escenarios (BD)*
y *Resultados (BD)*, y cada endpoint se puede probar con **Try it out**:

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/escenarios` | Historial de escenarios (más reciente primero) |
| GET | `/escenarios/{nombre}` | Un escenario con sus `parametros_entrada` |
| GET | `/escenarios/{nombre}/config` | El escenario en formato `dataConfig.json` |
| POST | `/escenarios` | Guardar un escenario `{nombre, config, descripcion?, reemplazar?}` |
| POST | `/escenarios/{nombre}/clonar` | Copiar `{nuevo, variaciones?}` |
| DELETE | `/escenarios/{nombre}` | Borrar un escenario y sus resultados |
| POST | `/resultados` | **Guardar una ejecución** |
| GET | `/resultados?escenario=&algoritmo=` | **Historial de resultados** |
| GET | `/resultados/{id}` | Un resultado con matriz, precios sombra y fitness |
| GET | `/resultados/comparativo?escenario=` | **Último Exacto vs. último Genético: costo, tiempo y gap** |

Ejemplo de cuerpo para `POST /resultados`:

```json
{
  "escenario": "dataConfig",
  "algoritmo_utilizado": "Genético",
  "costo_total": 152344000,
  "tiempo_ejecucion_ms": 850.5,
  "matriz_flujos": [[0,120,0,0],[250,0,0,0],[90,0,0,0],[0,0,180,0],[0,0,0,210],
                    [0,0,160,0],[110,0,0,0],[0,0,110,30],[0,80,0,0],[50,150,0,0]],
  "factible": true,
  "parametros_algoritmo": {"poblacion": 100, "generaciones": 500, "tasa_cruce": 0.8}
}
```

---

## Uso desde la Web UI (React)

`frontend/src/api/historial.js` trae las funciones listas:

```js
import { resolverExacto } from '../api/exacto.js'
import { guardarSolucion, listarResultados, obtenerComparativo,
         listarHistorialEscenarios } from '../api/historial.js'

// después de resolver, guardar la ejecución
const solucion = await resolverExacto(problema)
await guardarSolucion('dataConfig', solucion)          // convierte tiempo_s a ms

// historial para la página Comparativo
const escenarios = await listarHistorialEscenarios()
const resultados = await listarResultados({ escenario: 'dataConfig' })
const comparativo = await obtenerComparativo('dataConfig')   // gap_desviacion, tiempos...
```

## Uso desde Python

```python
from app.services.red import repositorio, repositorio_bd as bd

problema = repositorio.a_problema(repositorio.cargar_escenario("dataConfig"))
solucion = solver.resolver(problema)                 # ResultadoExacto
bd.guardar_solucion("dataConfig", solucion, parametros_algoritmo={"solver": "pulp"})

bd.listar_resultados("dataConfig")                   # historial
bd.historial_comparativo()                           # Exacto vs Genético por escenario
bd.clonar_escenario("dataConfig", "Costos +10%", {"variacion_costos_pct": 10})
```

Directamente con el ORM:

```python
from sqlalchemy import select
from app.db.sesion import sesion
from app.db.modelos import Escenario, Resultado

with sesion() as s:
    esc = s.scalar(select(Escenario).where(Escenario.nombre == "dataConfig"))
    print(esc.fecha, esc.parametros_entrada["oferta"])
    for r in esc.resultados:                         # ordenados del más reciente al más antiguo
        print(r.algoritmo_utilizado, r.costo_total, r.tiempo_ejecucion_ms, r.gap_desviacion)
```

Reglas:
- `matriz_flujos` va en el orden de `agroempresas` (filas) y `plantas` (columnas) del escenario.
- Los arreglos de NumPy se convierten con `.tolist()`.
- El gap de un Genético se calcula contra el último Exacto del escenario. Si el Genético se
  guarda primero, el gap queda vacío y se completa solo cuando se guarda el Exacto.

## Errores comunes

| Mensaje | Causa |
|---|---|
| `Falta DATABASE_URL en backend/.env` | El `.env` no está en `backend/`, tiene otro nombre o falta la línea |
| `password authentication failed` | La contraseña en `DATABASE_PASSWORD` está mal; restablézcanla en Supabase |
| `could not translate host name` / `timeout` | Copiaron *Direct connection*; usen **Session pooler** |
| `relation "escenarios" does not exist` | Falta el Paso 2 |
| `No module named 'sqlalchemy'` | Falta el Paso 5 |
| `503 La base de datos no está activa` | `FUENTE_DATOS` no es `bd` |
