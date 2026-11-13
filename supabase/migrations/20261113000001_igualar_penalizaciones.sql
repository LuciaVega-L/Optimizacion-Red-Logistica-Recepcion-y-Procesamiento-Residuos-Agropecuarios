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

-- guardar_config_escenario: si el escenario llega sin penalizaciones (campos vacíos
-- en Parametrización), ahora guarda 10^8 en lugar de 1.000. Misma definición que
-- 20261106000003_funciones.sql; create or replace conserva los permisos de la función.
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
