-- =====================================================================
-- PASO 1 · Tablas
-- EcoResiduos del Llano S.A.S. — Red logística de residuos agropecuarios
--
-- Tablas principales (las que pide el enunciado):
--   * escenarios  : id, nombre, fecha y parametros_entrada (oferta, demanda, costos)
--   * resultados  : id, escenario_id, algoritmo_utilizado ('Exacto' | 'Genético'),
--                   costo_total, tiempo_ejecucion_ms, gap_desviacion, matriz_flujos_json
--
-- Tablas de apoyo (detalle de la red y del análisis de sensibilidad):
--   * agroempresas, plantas, rutas : la red G = (V, E) que se edita desde la web
--   * precios_sombra               : duales uᵢ / vⱼ de cada resultado exacto
--
-- escenarios.parametros_entrada se calcula a partir de agroempresas, plantas
-- y rutas (función refrescar_parametros_entrada, paso 3); nunca se edita a mano.
-- =====================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid() (ya viene en Supabase)

-- ---------------------------------------------------------------------
-- escenarios
-- ---------------------------------------------------------------------
create table if not exists public.escenarios (
    id                              uuid primary key default gen_random_uuid(),
    nombre                          text not null unique
                                    check (length(trim(nombre)) > 0),
    fecha                           timestamptz not null default now(),
    descripcion                     text,
    -- {"fuentes": [...], "plantas": [...], "oferta": [...], "demanda": [...],
    --  "costos": [[...]], "distancias_km": [[...]], "costo_transporte_km_ton": 1200, ...}
    parametros_entrada              jsonb not null default '{}'::jsonb,
    es_base                         boolean not null default false,
    costo_transporte_km_ton         numeric not null default 1200
                                    check (costo_transporte_km_ton >= 0),
    factor_penalizacion_oferta      numeric not null default 1000
                                    check (factor_penalizacion_oferta >= 0),
    factor_penalizacion_capacidad   numeric not null default 1000
                                    check (factor_penalizacion_capacidad >= 0),
    escenario_origen_id             uuid references public.escenarios(id) on delete set null,
    variaciones                     jsonb not null default '{}'::jsonb,
    actualizado_en                  timestamptz not null default now()
);

comment on column public.escenarios.fecha is 'Fecha de creación del escenario.';
comment on column public.escenarios.parametros_entrada is
    'Parámetros de entrada del modelo: oferta, demanda (capacidad) y matriz de costos cᵢⱼ. Se calcula automáticamente.';
comment on column public.escenarios.variaciones is
    'Variaciones aplicadas si el escenario es derivado, p. ej. {"variacion_costos_pct": 10}.';

create unique index if not exists escenarios_un_solo_base
    on public.escenarios (es_base) where es_base;

-- ---------------------------------------------------------------------
-- agroempresas (fuentes, nodos de oferta)
-- ---------------------------------------------------------------------
create table if not exists public.agroempresas (
    id              uuid primary key default gen_random_uuid(),
    escenario_id    uuid not null references public.escenarios(id) on delete cascade,
    codigo          text not null check (length(trim(codigo)) > 0),   -- 'E01'
    nombre          text not null check (length(trim(nombre)) > 0),
    municipio       text,
    sector          text,
    oferta_ton_sem  numeric not null check (oferta_ton_sem >= 0),     -- Oᵢ
    orden           integer not null check (orden >= 0),              -- fila i
    unique (escenario_id, codigo),
    unique (escenario_id, orden),
    unique (id, escenario_id)
);

-- ---------------------------------------------------------------------
-- plantas (destinos, nodos de demanda)
-- ---------------------------------------------------------------------
create table if not exists public.plantas (
    id                          uuid primary key default gen_random_uuid(),
    escenario_id                uuid not null references public.escenarios(id) on delete cascade,
    codigo                      text not null check (length(trim(codigo)) > 0),  -- 'P1'
    nombre                      text not null check (length(trim(nombre)) > 0),
    municipio                   text,
    capacidad_maxima_ton_sem    numeric not null check (capacidad_maxima_ton_sem >= 0),  -- Dⱼ
    costo_operativo_ton         numeric not null check (costo_operativo_ton >= 0),       -- cⱼᵒᵖ
    orden                       integer not null check (orden >= 0),                     -- columna j
    unique (escenario_id, codigo),
    unique (escenario_id, orden),
    unique (id, escenario_id)
);

-- ---------------------------------------------------------------------
-- rutas (arcos (i,j) ∈ E)
-- ---------------------------------------------------------------------
create table if not exists public.rutas (
    escenario_id    uuid not null references public.escenarios(id) on delete cascade,
    agroempresa_id  uuid not null,
    planta_id       uuid not null,
    distancia_km    numeric not null check (distancia_km >= 0),   -- dᵢⱼ
    habilitada      boolean not null default true,
    primary key (agroempresa_id, planta_id),
    foreign key (agroempresa_id, escenario_id)
        references public.agroempresas (id, escenario_id) on delete cascade,
    foreign key (planta_id, escenario_id)
        references public.plantas (id, escenario_id) on delete cascade
);

create index if not exists rutas_escenario_idx on public.rutas (escenario_id);

-- ---------------------------------------------------------------------
-- resultados (una fila por cada ejecución del sistema)
--
-- matriz_flujos_json:
--   {"agroempresas": ["E01", ...], "plantas": ["P1", ...],
--    "toneladas": [[x11, x12, ...], ...]}          -- xᵢⱼ en t/semana
--
-- gap_desviacion (%) = (Z_AG − Z_exacto) / Z_exacto × 100
--   * 'Exacto'  -> 0
--   * 'Genético'-> se calcula solo contra el último resultado exacto del
--                  mismo escenario (trigger del paso 3). Queda NULL si aún
--                  no hay uno exacto y se completa cuando se guarde.
-- ---------------------------------------------------------------------
create table if not exists public.resultados (
    id                      uuid primary key default gen_random_uuid(),
    escenario_id            uuid not null references public.escenarios(id) on delete cascade,
    algoritmo_utilizado     text not null check (algoritmo_utilizado in ('Exacto', 'Genético')),
    costo_total             numeric not null check (costo_total >= 0),        -- Z
    tiempo_ejecucion_ms     double precision not null check (tiempo_ejecucion_ms >= 0),
    gap_desviacion          numeric,                                         -- %
    matriz_flujos_json      jsonb not null,
    -- campos adicionales útiles para el informe
    costo_transporte        numeric,
    costo_operativo         numeric,
    factible                boolean,
    parametros_algoritmo    jsonb not null default '{}'::jsonb,   -- población, generaciones, solver...
    historial_fitness       jsonb,                                -- convergencia del AG
    resultado_exacto_id     uuid references public.resultados(id) on delete set null,  -- contra cuál se midió el gap
    fecha                   timestamptz not null default now()
);

comment on column public.resultados.gap_desviacion is
    'Gap (%) = (Z_AG − Z_exacto) / Z_exacto × 100, contra el último resultado exacto del escenario.';

create index if not exists resultados_escenario_idx
    on public.resultados (escenario_id, algoritmo_utilizado, fecha desc);

-- ---------------------------------------------------------------------
-- precios_sombra (duales de un resultado exacto)
-- ---------------------------------------------------------------------
create table if not exists public.precios_sombra (
    resultado_id    uuid not null references public.resultados(id) on delete cascade,
    tipo            text not null check (tipo in ('oferta', 'capacidad')),
    nodo_codigo     text not null,
    valor_dual      numeric not null,
    holgura         numeric,
    rango_inferior  numeric,
    rango_superior  numeric,
    primary key (resultado_id, tipo, nodo_codigo)
);

-- ---------------------------------------------------------------------
-- actualizado_en automático
-- ---------------------------------------------------------------------
create or replace function public.tg_actualizado_en()
returns trigger language plpgsql
set search_path = public
as $$
begin
    new.actualizado_en := now();
    return new;
end;
$$;

drop trigger if exists escenarios_actualizado_en on public.escenarios;
create trigger escenarios_actualizado_en
    before update on public.escenarios
    for each row execute function public.tg_actualizado_en();
