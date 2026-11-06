-- =====================================================================
-- PASO 2 · Vistas de consulta
-- =====================================================================

-- ---------------------------------------------------------------------
-- Matriz de costos unitarios: cᵢⱼ = cᵤ·dᵢⱼ + cⱼᵒᵖ   [COP/ton]
-- ---------------------------------------------------------------------
create or replace view public.v_matriz_costos
with (security_invoker = true) as
select
    r.escenario_id,
    a.codigo                                    as agroempresa_codigo,
    p.codigo                                    as planta_codigo,
    a.orden                                     as fila,
    p.orden                                     as columna,
    r.distancia_km,
    e.costo_transporte_km_ton,
    p.costo_operativo_ton,
    e.costo_transporte_km_ton * r.distancia_km  as costo_transporte_ton,
    e.costo_transporte_km_ton * r.distancia_km
        + p.costo_operativo_ton                 as costo_unitario,
    r.habilitada
from public.rutas r
join public.escenarios   e on e.id = r.escenario_id
join public.agroempresas a on a.id = r.agroempresa_id
join public.plantas      p on p.id = r.planta_id;

-- ---------------------------------------------------------------------
-- Historial de escenarios con tamaño de la red, balance y nº de resultados
-- ---------------------------------------------------------------------
create or replace view public.v_resumen_escenarios
with (security_invoker = true) as
select
    e.id,
    e.nombre,
    e.fecha,
    e.descripcion,
    e.es_base,
    e.costo_transporte_km_ton,
    coalesce(a.n, 0)                               as num_agroempresas,
    coalesce(p.n, 0)                               as num_plantas,
    coalesce(r.n, 0)                               as num_rutas_habilitadas,
    coalesce(a.total, 0)                           as oferta_total,
    coalesce(p.total, 0)                           as capacidad_total,
    coalesce(p.total, 0) - coalesce(a.total, 0)    as holgura_capacidad,
    case
        when coalesce(a.total, 0) = coalesce(p.total, 0) then 'balanceada'
        when coalesce(a.total, 0) < coalesce(p.total, 0) then 'capacidad_sobrante'
        else 'oferta_excedente'
    end                                            as estado_balance,
    coalesce(res.n, 0)                             as num_resultados,
    res.ultima                                     as fecha_ultimo_resultado,
    e.escenario_origen_id,
    e.variaciones,
    e.actualizado_en
from public.escenarios e
left join (select escenario_id, count(*) n, sum(oferta_ton_sem) total
           from public.agroempresas group by escenario_id) a on a.escenario_id = e.id
left join (select escenario_id, count(*) n, sum(capacidad_maxima_ton_sem) total
           from public.plantas group by escenario_id) p on p.escenario_id = e.id
left join (select escenario_id, count(*) n
           from public.rutas where habilitada group by escenario_id) r on r.escenario_id = e.id
left join (select escenario_id, count(*) n, max(fecha) ultima
           from public.resultados group by escenario_id) res on res.escenario_id = e.id;

-- ---------------------------------------------------------------------
-- Análisis comparativo: último Exacto vs. último Genético de cada escenario
-- ---------------------------------------------------------------------
create or replace view public.v_historial_comparativo
with (security_invoker = true) as
with ultimo as (
    select distinct on (escenario_id, algoritmo_utilizado) *
    from public.resultados
    order by escenario_id, algoritmo_utilizado, fecha desc
)
select
    e.id                        as escenario_id,
    e.nombre                    as escenario,
    e.fecha                     as fecha_escenario,
    ex.id                       as resultado_exacto_id,
    ag.id                       as resultado_genetico_id,
    ex.costo_total              as costo_exacto,
    ag.costo_total              as costo_genetico,
    case when ex.costo_total > 0
         then (ag.costo_total - ex.costo_total) / ex.costo_total * 100
    end                         as gap_desviacion,
    ex.tiempo_ejecucion_ms      as tiempo_exacto_ms,
    ag.tiempo_ejecucion_ms      as tiempo_genetico_ms,
    ag.factible                 as genetico_factible,
    ag.parametros_algoritmo     as parametros_ag,
    greatest(ex.fecha, ag.fecha) as fecha_ultimo_resultado
from public.escenarios e
left join ultimo ex on ex.escenario_id = e.id and ex.algoritmo_utilizado = 'Exacto'
left join ultimo ag on ag.escenario_id = e.id and ag.algoritmo_utilizado = 'Genético'
where ex.id is not null or ag.id is not null;
