-- =====================================================================
-- PASO 4 · Seguridad
--
-- El backend (FastAPI + SQLAlchemy) se conecta directo a PostgreSQL con el
-- usuario "postgres" del proyecto. Ese usuario es dueño de las tablas y no
-- lo frena RLS. El navegador nunca se conecta a la base.
--
-- RLS activado y SIN políticas: la API pública de Supabase (claves anon /
-- publishable) no puede leer ni escribir nada.
-- =====================================================================

alter table public.escenarios     enable row level security;
alter table public.agroempresas   enable row level security;
alter table public.plantas        enable row level security;
alter table public.rutas          enable row level security;
alter table public.resultados     enable row level security;
alter table public.precios_sombra enable row level security;

do $$
declare
    f text;
begin
    foreach f in array array[
        'public.refrescar_parametros_entrada(uuid)',
        'public.obtener_config_escenario(text)',
        'public.guardar_config_escenario(text, jsonb, text, boolean, boolean)',
        'public.clonar_escenario(text, text, jsonb, text)',
        'public.tg_refrescar_parametros()',
        'public.tg_escenario_cu()',
        'public.tg_resultados_antes()',
        'public.tg_resultados_despues()',
        'public.tg_actualizado_en()'
    ] loop
        execute format('revoke execute on function %s from public', f);
        if exists (select 1 from pg_roles where rolname = 'anon') then
            execute format('revoke execute on function %s from anon, authenticated', f);
        end if;
    end loop;

    if exists (select 1 from pg_roles where rolname = 'anon') then
        revoke all on public.v_matriz_costos, public.v_resumen_escenarios,
                      public.v_historial_comparativo from anon, authenticated;
    end if;
end;
$$;
