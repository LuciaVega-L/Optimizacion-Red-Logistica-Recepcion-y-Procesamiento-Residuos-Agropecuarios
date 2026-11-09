-- =====================================================================
-- REINICIAR LA BASE DE DATOS (ejecutar UNA sola vez)
--
-- Borra las tablas, vistas y funciones de la versión anterior
-- (ejecuciones, asignaciones, comparativos...) y TODOS sus datos.
-- Después se ejecuta crear_base_datos_ecoresiduos.sql y se vuelve a
-- cargar el caso base con:  python -m scripts.sembrar_bd
--
-- ⚠ No lo ejecuten cuando ya tengan resultados que quieran conservar.
-- =====================================================================

drop view if exists public.v_comparativos, public.v_historial_comparativo,
                    public.v_resumen_escenarios, public.v_matriz_costos cascade;

drop table if exists public.comparativos, public.precios_sombra, public.asignaciones,
                     public.ejecuciones, public.resultados, public.rutas,
                     public.agroempresas, public.plantas, public.escenarios cascade;

drop function if exists public.guardar_ejecucion(text, jsonb) cascade;
drop function if exists public.registrar_comparativo(uuid, uuid, text) cascade;
drop function if exists public.clonar_escenario(text, text, jsonb, text) cascade;
drop function if exists public.guardar_config_escenario(text, jsonb, text, boolean, boolean) cascade;
drop function if exists public.obtener_config_escenario(text) cascade;
drop function if exists public.refrescar_parametros_entrada(uuid) cascade;
drop function if exists public.tg_refrescar_parametros() cascade;
drop function if exists public.tg_escenario_cu() cascade;
drop function if exists public.tg_resultados_antes() cascade;
drop function if exists public.tg_resultados_despues() cascade;
drop function if exists public.tg_actualizado_en() cascade;
