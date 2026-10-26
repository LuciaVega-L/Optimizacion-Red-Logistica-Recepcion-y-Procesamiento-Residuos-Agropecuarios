# Guía de trabajo en equipo

## Ramas
- `main`: versión estable, lista para sustentar. Nadie hace push directo.
- `develop`: integración del equipo.
- Ramas de trabajo desde `develop`, con prefijo por tipo:
  - `feature/exacto-modelo-pulp`
  - `feature/genetico-operadores`
  - `feature/front-parametrizacion`
  - `fix/...`, `docs/...`

## Ciclo
1. `git checkout develop && git pull`
2. `git checkout -b feature/nombre-corto`
3. Commits pequeños y descriptivos:
   `feat(genetico): agrega cruce de un punto`
   `fix(exacto): corrige restricción de demanda`
   `docs(informe): sección de formulación`
4. `git push -u origin feature/nombre-corto`
5. Pull Request hacia `develop`; otro integrante revisa y aprueba.

## Reglas
- No subir `.env`, `node_modules/` ni `.venv/`.
- Cada módulo de `backend/app/services/` debe tener su prueba en `backend/tests/`.
- No cambiar el contrato de un endpoint (`schemas/`) sin avisar al equipo.
