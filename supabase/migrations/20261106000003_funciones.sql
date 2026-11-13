-- =====================================================================
-- PASO 3 · Funciones y triggers
--
--   refrescar_parametros_entrada(id)  -> recalcula escenarios.parametros_entrada
--   obtener_config_escenario(nombre)  -> jsonb con el MISMO formato de dataConfig.json
--   guardar_config_escenario(...)     -> crea/reemplaza un escenario desde ese formato
--   clonar_escenario(...)             -> copia para sensibilidad (HU4) o HU8
--   trigger de resultados             -> normaliza el algoritmo, valida la matriz,
--                                        desglosa el costo y calcula el gap
-- =====================================================================

-- ---------------------------------------------------------------------
-- refrescar_parametros_entrada
-- Construye: fuentes, plantas, oferta, demanda, costo_operativo,
-- distancias_km, costos (cᵢⱼ), costo_transporte_km_ton, totales.
-- ---------------------------------------------------------------------
create or replace function public.refrescar_parametros_entrada(p_escenario uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
    update public.escenarios e
    set parametros_entrada = jsonb_build_object(
        'fuentes',  coalesce((select jsonb_agg(a.codigo order by a.orden)
                              from public.agroempresas a where a.escenario_id = e.id), '[]'::jsonb),
        'plantas',  coalesce((select jsonb_agg(p.codigo order by p.orden)
                              from public.plantas p where p.escenario_id = e.id), '[]'::jsonb),
        'oferta',   coalesce((select jsonb_agg(a.oferta_ton_sem order by a.orden)
                              from public.agroempresas a where a.escenario_id = e.id), '[]'::jsonb),
        'demanda',  coalesce((select jsonb_agg(p.capacidad_maxima_ton_sem order by p.orden)
                              from public.plantas p where p.escenario_id = e.id), '[]'::jsonb),
        'costo_operativo', coalesce((select jsonb_agg(p.costo_operativo_ton order by p.orden)
                              from public.plantas p where p.escenario_id = e.id), '[]'::jsonb),
        'costo_transporte_km_ton', e.costo_transporte_km_ton,
        'distancias_km', coalesce((
            select jsonb_agg(f.fila order by f.fila_i) from (
                select mc.fila as fila_i, jsonb_agg(mc.distancia_km order by mc.columna) as fila
                from public.v_matriz_costos mc where mc.escenario_id = e.id
                group by mc.fila) f), '[]'::jsonb),
        'costos', coalesce((
            select jsonb_agg(f.fila order by f.fila_i) from (
                select mc.fila as fila_i, jsonb_agg(mc.costo_unitario order by mc.columna) as fila
                from public.v_matriz_costos mc where mc.escenario_id = e.id
                group by mc.fila) f), '[]'::jsonb),
        'rutas_deshabilitadas', coalesce((
            select jsonb_agg(jsonb_build_array(mc.agroempresa_codigo, mc.planta_codigo)
                             order by mc.fila, mc.columna)
            from public.v_matriz_costos mc where mc.escenario_id = e.id and not mc.habilitada), '[]'::jsonb),
        'oferta_total',    coalesce((select sum(a.oferta_ton_sem)
                                     from public.agroempresas a where a.escenario_id = e.id), 0),
        'capacidad_total', coalesce((select sum(p.capacidad_maxima_ton_sem)
                                     from public.plantas p where p.escenario_id = e.id), 0),
        'unidades', jsonb_build_object('oferta_demanda', 't/semana', 'costos', 'COP/t',
                                       'distancias', 'km', 'costo_transporte', 'COP/(km·t)')
    )
    where e.id = p_escenario;
end;
$$;

-- Mantener parametros_entrada al día si se edita la red desde el ORM o el Table Editor
create or replace function public.tg_refrescar_parametros()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if coalesce(current_setting('eco.sin_refresco', true), '') = 'on' then
        return null;
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
        perform public.refrescar_parametros_entrada(new.escenario_id);
    end if;
    if tg_op in ('UPDATE', 'DELETE') and (tg_op = 'DELETE' or old.escenario_id <> new.escenario_id) then
        perform public.refrescar_parametros_entrada(old.escenario_id);
    end if;
    return null;
end;
$$;

drop trigger if exists agroempresas_refrescar on public.agroempresas;
create trigger agroempresas_refrescar after insert or update or delete on public.agroempresas
    for each row execute function public.tg_refrescar_parametros();
drop trigger if exists plantas_refrescar on public.plantas;
create trigger plantas_refrescar after insert or update or delete on public.plantas
    for each row execute function public.tg_refrescar_parametros();
drop trigger if exists rutas_refrescar on public.rutas;
create trigger rutas_refrescar after insert or update or delete on public.rutas
    for each row execute function public.tg_refrescar_parametros();

create or replace function public.tg_escenario_cu()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    perform public.refrescar_parametros_entrada(new.id);
    return null;
end;
$$;

drop trigger if exists escenarios_refrescar_cu on public.escenarios;
create trigger escenarios_refrescar_cu after update of costo_transporte_km_ton on public.escenarios
    for each row execute function public.tg_escenario_cu();

-- ---------------------------------------------------------------------
-- obtener_config_escenario: mismas claves que dataConfig.json
-- (EvaluadorFitness lee la penalización de oferta en "factorPlanta"
--  y la de capacidad en "factorDemanda")
-- ---------------------------------------------------------------------
create or replace function public.obtener_config_escenario(p_nombre text)
returns jsonb
language plpgsql stable
set search_path = public
as $$
declare
    e   public.escenarios%rowtype;
begin
    select * into e from public.escenarios where nombre = p_nombre;
    if not found then
        raise exception 'No existe el escenario "%"', p_nombre using errcode = 'P0002';
    end if;

    return jsonb_build_object(
        '_meta', jsonb_build_object(
            'escenario_id',        e.id,
            'nombre',              e.nombre,
            'fecha',               e.fecha,
            'descripcion',         e.descripcion,
            'es_base',             e.es_base,
            'escenario_origen_id', e.escenario_origen_id,
            'variaciones',         e.variaciones,
            'fuente',              'base_de_datos'
        ),
        'parametros_globales', jsonb_build_object(
            'costo_transporte_km_ton', e.costo_transporte_km_ton
        ),
        'penalizaciones', jsonb_build_object(
            'factorPlanta',  e.factor_penalizacion_oferta,
            'factorDemanda', e.factor_penalizacion_capacidad
        ),
        'plantas', (
            select coalesce(jsonb_agg(jsonb_build_object(
                       'id',                       p.codigo,
                       'nombre',                   p.nombre,
                       'municipio',                p.municipio,
                       'capacidad_maxima_ton_sem', p.capacidad_maxima_ton_sem,
                       'costo_operativo_ton',      p.costo_operativo_ton
                   ) order by p.orden), '[]'::jsonb)
            from public.plantas p where p.escenario_id = e.id
        ),
        'agroempresas', (
            select coalesce(jsonb_agg(jsonb_build_object(
                       'id',             a.codigo,
                       'nombre',         a.nombre,
                       'municipio',      a.municipio,
                       'sector',         a.sector,
                       'oferta_ton_sem', a.oferta_ton_sem
                   ) order by a.orden), '[]'::jsonb)
            from public.agroempresas a where a.escenario_id = e.id
        ),
        'matriz_distancias_km', (
            select coalesce(jsonb_object_agg(f.codigo, f.fila), '{}'::jsonb)
            from (
                select a.codigo, jsonb_object_agg(p.codigo, r.distancia_km) as fila
                from public.rutas r
                join public.agroempresas a on a.id = r.agroempresa_id
                join public.plantas      p on p.id = r.planta_id
                where r.escenario_id = e.id
                group by a.codigo
            ) f
        ),
        'rutas_deshabilitadas', e.parametros_entrada -> 'rutas_deshabilitadas'
    );
end;
$$;

-- ---------------------------------------------------------------------
-- guardar_config_escenario
-- Recibe el formato de dataConfig.json. Exige distancia para cada pareja
-- agroempresa-planta; una ruta se retira con
--   "rutas_deshabilitadas": [["E01","P4"], ...].
-- Con p_reemplazar = true sobrescribe la red (los resultados se conservan).
-- ---------------------------------------------------------------------
create or replace function public.guardar_config_escenario(
    p_nombre       text,
    p_config       jsonb,
    p_descripcion  text    default null,
    p_es_base      boolean default false,
    p_reemplazar   boolean default false
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
    v_id        uuid;
    v_cu        numeric := coalesce((p_config #>> '{parametros_globales,costo_transporte_km_ton}')::numeric, 1200);
    v_pen_o     numeric := coalesce((p_config #>> '{penalizaciones,factorPlanta}')::numeric, 100000000);
    v_pen_c     numeric := coalesce((p_config #>> '{penalizaciones,factorDemanda}')::numeric, 100000000);
    v_desc      text    := coalesce(p_descripcion, p_config #>> '{_meta,descripcion}');
    v_faltante  record;
begin
    if p_nombre is null or length(trim(p_nombre)) = 0 then
        raise exception 'El nombre del escenario es obligatorio';
    end if;
    if jsonb_typeof(p_config -> 'agroempresas') is distinct from 'array'
       or jsonb_array_length(p_config -> 'agroempresas') = 0 then
        raise exception 'El escenario debe tener al menos una agroempresa en "agroempresas"';
    end if;
    if jsonb_typeof(p_config -> 'plantas') is distinct from 'array'
       or jsonb_array_length(p_config -> 'plantas') = 0 then
        raise exception 'El escenario debe tener al menos una planta en "plantas"';
    end if;

    -- los triggers de refresco se suspenden durante la carga y se refresca una vez al final
    perform set_config('eco.sin_refresco', 'on', true);

    select id into v_id from public.escenarios where nombre = p_nombre;

    if v_id is not null and not p_reemplazar then
        raise exception 'Ya existe el escenario "%". Use reemplazar = true para sobrescribirlo', p_nombre
            using errcode = '23505';
    end if;

    if p_es_base then
        update public.escenarios set es_base = false
        where es_base and id is distinct from v_id;
    end if;

    if v_id is null then
        insert into public.escenarios (nombre, descripcion, es_base, costo_transporte_km_ton,
                                       factor_penalizacion_oferta, factor_penalizacion_capacidad)
        values (p_nombre, v_desc, p_es_base, v_cu, v_pen_o, v_pen_c)
        returning id into v_id;
    else
        update public.escenarios
        set descripcion                   = v_desc,
            es_base                       = p_es_base or es_base,
            costo_transporte_km_ton       = v_cu,
            factor_penalizacion_oferta    = v_pen_o,
            factor_penalizacion_capacidad = v_pen_c
        where id = v_id;
        delete from public.agroempresas where escenario_id = v_id;
        delete from public.plantas      where escenario_id = v_id;
    end if;

    insert into public.plantas (escenario_id, codigo, nombre, municipio,
                                capacidad_maxima_ton_sem, costo_operativo_ton, orden)
    select v_id,
           x ->> 'id',
           coalesce(x ->> 'nombre', x ->> 'id'),
           x ->> 'municipio',
           (x ->> 'capacidad_maxima_ton_sem')::numeric,
           (x ->> 'costo_operativo_ton')::numeric,
           (ord - 1)::int
    from jsonb_array_elements(p_config -> 'plantas') with ordinality as t(x, ord);

    insert into public.agroempresas (escenario_id, codigo, nombre, municipio, sector,
                                     oferta_ton_sem, orden)
    select v_id,
           x ->> 'id',
           coalesce(x ->> 'nombre', x ->> 'id'),
           x ->> 'municipio',
           x ->> 'sector',
           (x ->> 'oferta_ton_sem')::numeric,
           (ord - 1)::int
    from jsonb_array_elements(p_config -> 'agroempresas') with ordinality as t(x, ord);

    select a.codigo as e, p.codigo as pl into v_faltante
    from public.agroempresas a cross join public.plantas p
    where a.escenario_id = v_id and p.escenario_id = v_id
      and (p_config -> 'matriz_distancias_km' -> a.codigo ->> p.codigo) is null
    limit 1;
    if found then
        raise exception 'Falta la distancia de % a % en "matriz_distancias_km"', v_faltante.e, v_faltante.pl;
    end if;

    insert into public.rutas (escenario_id, agroempresa_id, planta_id, distancia_km, habilitada)
    select v_id, a.id, p.id,
           (p_config -> 'matriz_distancias_km' -> a.codigo ->> p.codigo)::numeric,
           not coalesce(p_config -> 'rutas_deshabilitadas' @> jsonb_build_array(jsonb_build_array(a.codigo, p.codigo)), false)
    from public.agroempresas a cross join public.plantas p
    where a.escenario_id = v_id and p.escenario_id = v_id;

    perform set_config('eco.sin_refresco', 'off', true);
    perform public.refrescar_parametros_entrada(v_id);
    return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- clonar_escenario: copia completa; el original no se modifica (HU4)
-- ---------------------------------------------------------------------
create or replace function public.clonar_escenario(
    p_origen       text,
    p_nuevo        text,
    p_variaciones  jsonb default '{}'::jsonb,
    p_descripcion  text  default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
    v_cfg     jsonb := public.obtener_config_escenario(p_origen);
    v_nuevo   uuid;
begin
    v_nuevo := public.guardar_config_escenario(
        p_nuevo, v_cfg, coalesce(p_descripcion, 'Copia de ' || p_origen), false, false);

    update public.escenarios
    set escenario_origen_id = (v_cfg #>> '{_meta,escenario_id}')::uuid,
        variaciones         = coalesce(p_variaciones, '{}'::jsonb)
    where id = v_nuevo;

    return v_nuevo;
end;
$$;

-- ---------------------------------------------------------------------
-- Trigger de resultados (antes de insertar)
--  1. Normaliza algoritmo_utilizado: 'exacto' -> 'Exacto', 'genetico'/'ag' -> 'Genético'
--  2. Acepta matriz_flujos_json como lista de listas y le agrega los códigos
--  3. Valida que la matriz tenga n × m (agroempresas × plantas) y sin negativos
--  4. Calcula costo_transporte y costo_operativo si no vienen
--  5. Calcula gap_desviacion contra el último resultado exacto del escenario
-- ---------------------------------------------------------------------
create or replace function public.tg_resultados_antes()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    v_alg   text := lower(trim(new.algoritmo_utilizado));
    v_mat   jsonb;
    v_n     int;
    v_m     int;
    v_ex    public.resultados%rowtype;
begin
    new.algoritmo_utilizado := case
        when v_alg in ('exacto', 'exact', 'pl', 'lp', 'simplex') then 'Exacto'
        when v_alg in ('genético', 'genetico', 'ag', 'ga', 'algoritmo genético', 'algoritmo genetico') then 'Genético'
        else new.algoritmo_utilizado end;

    select count(*) into v_n from public.agroempresas where escenario_id = new.escenario_id;
    select count(*) into v_m from public.plantas      where escenario_id = new.escenario_id;

    if jsonb_typeof(new.matriz_flujos_json) = 'array' then
        new.matriz_flujos_json := jsonb_build_object('toneladas', new.matriz_flujos_json);
    end if;
    v_mat := new.matriz_flujos_json -> 'toneladas';

    if jsonb_typeof(v_mat) is distinct from 'array' or jsonb_array_length(v_mat) <> v_n
       or exists (select 1 from jsonb_array_elements(v_mat) f
                  where jsonb_typeof(f) <> 'array' or jsonb_array_length(f) <> v_m) then
        raise exception 'matriz_flujos_json debe ser una matriz de % filas (agroempresas) por % columnas (plantas)', v_n, v_m
            using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements(v_mat) f, jsonb_array_elements(f) x
               where jsonb_typeof(x) <> 'number' or (x #>> '{}')::numeric < 0) then
        raise exception 'matriz_flujos_json solo admite toneladas numéricas >= 0' using errcode = '22023';
    end if;

    new.matriz_flujos_json := new.matriz_flujos_json
        || jsonb_build_object(
            'agroempresas', coalesce(new.matriz_flujos_json -> 'agroempresas',
                (select jsonb_agg(codigo order by orden) from public.agroempresas where escenario_id = new.escenario_id)),
            'plantas', coalesce(new.matriz_flujos_json -> 'plantas',
                (select jsonb_agg(codigo order by orden) from public.plantas where escenario_id = new.escenario_id)));

    if new.costo_transporte is null or new.costo_operativo is null then
        select coalesce(new.costo_transporte, sum((x.val #>> '{}')::numeric * mc.costo_transporte_ton)),
               coalesce(new.costo_operativo,  sum((x.val #>> '{}')::numeric * mc.costo_operativo_ton))
          into new.costo_transporte, new.costo_operativo
        from jsonb_array_elements(v_mat) with ordinality as f(fila, i)
        cross join lateral jsonb_array_elements(f.fila) with ordinality as x(val, j)
        join public.v_matriz_costos mc
          on mc.escenario_id = new.escenario_id and mc.fila = f.i - 1 and mc.columna = x.j - 1;
    end if;

    if new.algoritmo_utilizado = 'Exacto' then
        new.gap_desviacion := 0;
        new.resultado_exacto_id := null;
    elsif new.gap_desviacion is null then
        select * into v_ex from public.resultados
        where escenario_id = new.escenario_id and algoritmo_utilizado = 'Exacto'
        order by fecha desc limit 1;
        if v_ex.id is not null and v_ex.costo_total > 0 then
            new.resultado_exacto_id := v_ex.id;
            new.gap_desviacion := (new.costo_total - v_ex.costo_total) / v_ex.costo_total * 100;
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists resultados_antes on public.resultados;
create trigger resultados_antes before insert on public.resultados
    for each row execute function public.tg_resultados_antes();

-- Al guardar un resultado Exacto, completa el gap de los Genéticos que estaban sin referencia
create or replace function public.tg_resultados_despues()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.algoritmo_utilizado = 'Exacto' and new.costo_total > 0 then
        update public.resultados r
        set gap_desviacion      = (r.costo_total - new.costo_total) / new.costo_total * 100,
            resultado_exacto_id = new.id
        where r.escenario_id = new.escenario_id
          and r.algoritmo_utilizado = 'Genético'
          and r.gap_desviacion is null;
    end if;
    return null;
end;
$$;

drop trigger if exists resultados_despues on public.resultados;
create trigger resultados_despues after insert on public.resultados
    for each row execute function public.tg_resultados_despues();
