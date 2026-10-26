# Formulación del modelo de transporte

## Conjuntos
- I = {1..10}: agroempresas (fuentes)
- J = {1..4}: plantas (Villavicencio, Restrepo, Granada, Puerto Gaitán)

## Parámetros
- a_i: oferta semanal de la agroempresa i (ton)
- b_j: capacidad máxima de la planta j (ton/semana)
- d_ij: distancia vial i→j (km)
- t: costo de transporte (COP/km·ton) — caso base 1200
- o_j: costo operativo de la planta j (COP/ton)
- c_ij = d_ij · t + o_j : costo unitario total i→j (COP/ton)

Datos: `backend/data/escenarios/dataConfig.json`.
Caso base: oferta total 1540 ton < capacidad total 1700 ton (problema desbalanceado).

## Variables
- x_ij ≥ 0: toneladas enviadas de i a j

## Función objetivo
min Z = Σ_i Σ_j c_ij · x_ij

## Restricciones
- Oferta: Σ_j x_ij = a_i   ∀ i   (se recoge todo el residuo generado)
- Capacidad: Σ_i x_ij ≤ b_j  ∀ j
- No negatividad: x_ij ≥ 0

> Por completar por el Ingeniero de Modelado (rol 2).
