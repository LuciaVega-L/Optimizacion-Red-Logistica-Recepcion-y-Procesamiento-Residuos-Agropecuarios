-- =====================================================================
-- PASO 5 · Igualar las penalizaciones del AG con dataConfig.json (10^8)
--
-- Las columnas factor_penalizacion_* tenían 1.000 por defecto y el escenario
-- base se guardó con ese valor, mientras dataConfig.json usa 10^8. Con 1.000,
-- exceder una capacidad le sale más barato al AG que lo que ahorra en una ruta.
--
-- Solo cambia los escenarios que tienen exactamente el valor viejo por defecto
-- (1.000); los que alguien guardó con otro valor se respetan.
-- Se puede ejecutar varias veces sin problema.
-- =====================================================================

alter table public.escenarios
    alter column factor_penalizacion_oferta    set default 100000000,
    alter column factor_penalizacion_capacidad set default 100000000;

update public.escenarios
set factor_penalizacion_oferta = 100000000
where factor_penalizacion_oferta = 1000;

update public.escenarios
set factor_penalizacion_capacidad = 100000000
where factor_penalizacion_capacidad = 1000;
