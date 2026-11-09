# Formulación del modelo de transporte

Versión completa en el informe IEEE (secciones II-B a II-F). Implementación en
`backend/app/services/exacto/`.

## Conjuntos
- I = {E01..E10}: agroempresas (fuentes)
- J = {P1..P4}: plantas (Villavicencio, Restrepo, Granada, Puerto Gaitán)

## Parámetros
- O_i: oferta semanal de la agroempresa i (t/sem)
- D_j: capacidad máxima de la planta j (t/sem)
- d_ij: distancia vial i→j (km)
- c_u: costo de transporte, 1200 COP/(km·t)
- c_j^op: costo operativo de la planta j (COP/t)
- c_ij = c_u · d_ij + c_j^op (COP/t)

Datos: `backend/data/escenarios/dataConfig.json`. Caso base: ΣO = 1540 < ΣD = 1700.

## Modelo
min Z = Σ_i Σ_j c_ij x_ij
- Oferta: Σ_j x_ij = O_i  ∀i
- Capacidad: Σ_i x_ij ≤ D_j  ∀j
- x_ij ≥ 0

## Forma balanceada (la que resuelve el software)
Si ΣO < ΣD se agrega la agroempresa ficticia E11 (oferta ΣD − ΣO, costo 0) y todas las
restricciones pasan a igualdad. Si ΣO > ΣD se agrega una planta ficticia (residuo sin procesar).

## Dual
u_i libre (oferta), v_j ≤ 0 (capacidad), u_i + v_j ≤ c_ij. En el software el dual del nodo
ficticio se fija en 0, así v_j = 0 en las plantas con capacidad ociosa.

## Resultado del caso base
- Z* = 132 532 000 COP/semana
- P1, P2 y P3 al 100 %; P4 con 160 t/sem ociosas (flujo de E11)
- v = (−29 000; −11 600; −47 200; 0) COP/t
- u = (44 400; 154 800; 87 600; 94 800; 150 000; 121 200; 105 600; 156 000; 39 600; 79 200) COP/t
- Base no degenerada (14 variables básicas) con óptimos alternativos: E03→P1 y E08→P2 tienen
  costo reducido 0.
