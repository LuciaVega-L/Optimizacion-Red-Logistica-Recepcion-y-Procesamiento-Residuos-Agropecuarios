# Formulación del modelo de transporte

## Conjuntos
- I = {1..10}: agroempresas (fuentes)
- J = {1..4}: plantas (Villavicencio, Restrepo, Granada, Puerto Gaitán)

## Parámetros
- a_i: oferta semanal de la agroempresa i (ton)
- b_j: capacidad/demanda de la planta j (ton)
- c_ij: costo unitario de transporte i→j ($/ton) = distancia_ij × costo_km_ton

## Variables
- x_ij ≥ 0: toneladas enviadas de i a j

## Función objetivo
min Z = Σ_i Σ_j c_ij · x_ij

## Restricciones
- Oferta: Σ_j x_ij ≤ a_i   ∀ i
- Demanda: Σ_i x_ij ≥ b_j  ∀ j   (o = si el problema está balanceado)
- No negatividad: x_ij ≥ 0

> Por completar por el Ingeniero de Modelado (rol 2).
