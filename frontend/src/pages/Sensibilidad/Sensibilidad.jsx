import { useEffect, useState } from 'react'
import { escenariosPredefinidos, simularEscenarios } from '../../api/sensibilidad.js'
import Aviso from '../../components/comunes/Aviso.jsx'
import Boton from '../../components/comunes/Boton.jsx'
import Cargando from '../../components/comunes/Cargando.jsx'
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina.jsx'
import { EsqueletoGrafica, EsqueletoKpis, EsqueletoTabla } from '../../components/comunes/Esqueleto.jsx'
import EstadoVacio from '../../components/comunes/EstadoVacio.jsx'
import Icono from '../../components/comunes/Icono.jsx'
import Plegable from '../../components/comunes/Plegable.jsx'
import SinDatos from '../../components/comunes/SinDatos.jsx'
import Tarjeta from '../../components/comunes/Tarjeta.jsx'
import GraficaSensibilidad from '../../components/graficas/GraficaSensibilidad.jsx'
import { useNotificaciones } from '../../context/NotificacionesContext.jsx'
import { usePeticion } from '../../hooks/usePeticion.js'
import { useProblema } from '../../hooks/useProblema.js'
import { descargarCSV } from '../../utils/exportar.js'
import { limite, moneda, numero, porcentaje } from '../../utils/formato.js'
import { FormularioAG, PARAMETROS_AG_INICIALES } from '../Genetico/Genetico.jsx'

const NUEVO = { nombre: '', tipo: 'costos', objetivo: '', pct: 10 }

function aEscenario({ nombre, tipo, objetivo, pct }) {
  const e = { nombre }
  if (tipo === 'costos') e.variacion_costos_pct = pct
  if (tipo === 'oferta') { e.variacion_oferta_pct = pct; e.oferta_objetivo = objetivo || null }
  if (tipo === 'capacidad') { e.variacion_demanda_pct = pct; e.demanda_objetivo = objetivo || null }
  return e
}

function describir(e) {
  const partes = []
  if (e.variacion_costos_pct) partes.push(`transporte ${e.variacion_costos_pct > 0 ? '+' : ''}${e.variacion_costos_pct} %`)
  if (e.variacion_oferta_pct) partes.push(`oferta ${e.oferta_objetivo ?? 'todas'} ${e.variacion_oferta_pct > 0 ? '+' : ''}${e.variacion_oferta_pct} %`)
  if (e.variacion_demanda_pct) partes.push(`capacidad ${e.demanda_objetivo ?? 'todas'} ${e.variacion_demanda_pct > 0 ? '+' : ''}${e.variacion_demanda_pct} %`)
  return partes.join(', ') || 'sin cambios'
}

function TablaRangos({ filas, unidad }) {
  return (
    <div className="tabla-contenedor">
      <table className="tabla tabla--compacta tabla--numeros">
        <thead><tr><th>Nodo</th><th>Actual ({unidad})</th><th>Precio sombra</th><th>Mínimo</th><th>Máximo</th></tr></thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id} title={f.nota ?? ''}>
              <th>{f.id}</th><td>{numero(f.valor_actual)}</td><td>{moneda(f.precio_sombra)}</td>
              <td>{limite(f.minimo)}</td><td>{limite(f.maximo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Sensibilidad() {
  const { problema, errores, resultados, guardarResultado } = useProblema()
  const [escenarios, setEscenarios] = useState([])
  const [nuevo, setNuevo] = useState(NUEVO)
  const [incluirAg, setIncluirAg] = useState(false)
  const [parametrosAg, setParametrosAg] = useState(PARAMETROS_AG_INICIALES)
  const [soloBasicas, setSoloBasicas] = useState(true)
  const { cargando, error, ejecutar } = usePeticion()
  const { notificar } = useNotificaciones()
  const res = resultados.sensibilidad

  useEffect(() => {
    if (problema && !escenarios.length) escenariosPredefinidos(problema).then(setEscenarios).catch(() => {})
  }, [problema]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!problema) {
    return <section><EncabezadoPagina titulo="Análisis de sensibilidad" /><SinDatos errores={errores} /></section>
  }

  const agregar = () => {
    const nombre = nuevo.nombre.trim() || `Escenario ${escenarios.length + 1}`
    setEscenarios([...escenarios, aEscenario({ ...nuevo, nombre })])
    setNuevo(NUEVO)
    notificar(`Escenario «${nombre}» agregado`)
  }

  const simular = async () => {
    const r = await ejecutar(() => simularEscenarios(problema, escenarios, incluirAg, parametrosAg))
    if (r) {
      guardarResultado('sensibilidad', r)
      notificar(`${r.escenarios.length} escenarios simulados`)
    }
  }

  const exportar = () => {
    descargarCSV('sensibilidad_escenarios',
      ['Escenario', 'Cambios', 'Z* exacto (COP/sem)', 'Variación (COP)', 'Variación (%)', '¿Misma base?',
        'Z AG (COP/sem)', 'Gap AG (%)', 'Error'],
      res.escenarios.map((e) => [e.nombre ?? e.escenario.nombre, describir(e.escenario), e.costo_total,
        e.variacion_costo, e.variacion_costo_pct, e.base_optima_se_mantiene ? 'Sí' : 'No',
        e.genetico?.costo_total, e.gap_pct, e.error ?? e.error_ag]))
    notificar('CSV de escenarios descargado')
  }

  const exportarRangos = () => {
    descargarCSV('rangos_costos',
      ['Ruta', 'Básica', 'Flujo', 'Costo actual', 'Costo reducido', 'Mínimo', 'Máximo'],
      res.rangos.costos.map((f) => [f.ruta, f.basica ? 'Sí' : 'No', f.flujo, f.costo_actual,
        f.costo_reducido, f.minimo, f.maximo ?? '∞']))
    notificar('CSV de rangos descargado')
  }

  const objetivos = nuevo.tipo === 'oferta' ? problema.fuentes : nuevo.tipo === 'capacidad' ? problema.plantas : []
  const conAg = res?.escenarios.some((e) => e.genetico || e.error_ag)
  const validos = res?.escenarios.filter((e) => !e.error) ?? []
  const cambianBase = validos.filter((e) => !e.base_optima_se_mantiene).length
  const mayor = validos.reduce((m, e) => (m && Math.abs(m.variacion_costo_pct) >= Math.abs(e.variacion_costo_pct) ? m : e), null)
  const rutas = res?.rangos.costos.filter((f) => !soloBasicas || f.basica) ?? []

  return (
    <section>
      <EncabezadoPagina titulo="Análisis de sensibilidad" descripcion="Cómo cambia el costo óptimo si cambian costos, oferta o capacidad.">
        <Boton onClick={simular} disabled={!escenarios.length} cargando={cargando}>
          {!cargando && <Icono nombre="jugar" tamano={16} />}Simular {escenarios.length || ''} escenarios
        </Boton>
        {res && <Boton variante="secundario" onClick={exportar}><Icono nombre="descargar" tamano={16} />CSV</Boton>}
      </EncabezadoPagina>

      <Tarjeta titulo="Escenarios">
        {!escenarios.length ? (
          <EstadoVacio compacto titulo="No hay escenarios"
            descripcion="Agrega al menos uno con el formulario de abajo para poder simular." />
        ) : (
          <ul className="lista-escenarios">
            {escenarios.map((e, k) => (
              <li key={k}>
                <span className="lista-escenarios__nombre">{e.nombre}</span>
                <span className="lista-escenarios__detalle">{describir(e)}</span>
                <button type="button" className="boton boton--fantasma boton--mini" aria-label={`Quitar ${e.nombre}`}
                  disabled={cargando} onClick={() => setEscenarios(escenarios.filter((_, i) => i !== k))}>
                  <Icono nombre="cerrar" tamano={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <h3 className="subtitulo">Nuevo escenario</h3>
        <div className="formulario formulario--linea">
          <label className="campo">Nombre
            <input value={nuevo.nombre} placeholder="p. ej. Paro camionero"
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} /></label>
          <label className="campo">Parámetro
            <select value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value, objetivo: '' })}>
              <option value="costos">Costo de transporte</option>
              <option value="oferta">Oferta de residuos</option>
              <option value="capacidad">Capacidad de planta</option>
            </select></label>
          {nuevo.tipo !== 'costos' && (
            <label className="campo">Aplicar a
              <select value={nuevo.objetivo} onChange={(e) => setNuevo({ ...nuevo, objetivo: e.target.value })}>
                <option value="">Todas</option>
                {objetivos.map((id) => <option key={id}>{id}</option>)}
              </select></label>
          )}
          <label className="campo">Variación (%)
            <input type="number" step="5" value={nuevo.pct}
              onChange={(e) => setNuevo({ ...nuevo, pct: Number(e.target.value) })} /></label>
          <Boton variante="secundario" onClick={agregar}><Icono nombre="mas" tamano={16} />Agregar</Boton>
        </div>
        <label className="campo campo--check">
          <input type="checkbox" checked={incluirAg} onChange={(e) => setIncluirAg(e.target.checked)} />
          Resolver también con el algoritmo genético
        </label>
        {incluirAg && <FormularioAG valores={parametrosAg} onCambio={setParametrosAg} deshabilitado={cargando} />}
      </Tarjeta>

      {cargando && (
        <Cargando texto="Simulando escenarios…">
          <EsqueletoKpis cantidad={3} />
          <EsqueletoGrafica alto={220} />
          <EsqueletoTabla columnas={5} />
        </Cargando>
      )}
      {error && !cargando && <Aviso tipo="error" titulo="No se pudieron simular los escenarios" mensajes={[error]} onReintentar={simular} />}
      {!res && !cargando && !error && escenarios.length > 0 && (
        <EstadoVacio titulo="Sin resultados todavía" icono="jugar"
          descripcion="Pulsa «Simular» para ver la variación de Z* y los rangos de la base óptima." />
      )}

      {res && !cargando && (
        <>
          <div className="kpis">
            <Tarjeta destacada titulo="Z* caso base" valor={moneda(res.base.costo_total)} detalle="COP por semana" />
            <Tarjeta titulo="Mayor variación" valor={mayor ? porcentaje(mayor.variacion_costo_pct) : '—'} detalle={mayor?.nombre} />
            <Tarjeta titulo="Cambian la base" valor={`${cambianBase} de ${validos.length}`}
              tono={cambianBase ? undefined : 'ok'} />
          </div>

          <Tarjeta titulo="Variación de Z* por escenario">
            <GraficaSensibilidad escenarios={res.escenarios} />
            <div className="tabla-contenedor">
              <table className="tabla tabla--compacta tabla--numeros">
                <thead><tr><th>Escenario</th><th>Z* exacto</th><th>Δ Z*</th><th>Δ %</th><th>¿Misma base?</th>
                  {conAg && <><th>Z AG</th><th>Gap AG</th></>}</tr></thead>
                <tbody>
                  {res.escenarios.map((e, k) => e.error ? (
                    <tr key={k}><th>{e.escenario.nombre}</th><td colSpan={conAg ? 6 : 4} className="texto-error">{e.error}</td></tr>
                  ) : (
                    <tr key={k}>
                      <th title={describir(e.escenario)}>{e.nombre}</th>
                      <td>{moneda(e.costo_total)}</td><td>{moneda(e.variacion_costo)}</td>
                      <td>{porcentaje(e.variacion_costo_pct)}</td>
                      <td className={e.base_optima_se_mantiene ? 'texto-ok' : 'texto-alerta'}>
                        {e.base_optima_se_mantiene ? 'Sí' : 'Cambia'}</td>
                      {conAg && <>
                        <td title={e.error_ag ?? ''}>{e.genetico ? moneda(e.genetico.costo_total) : 'N/D'}</td>
                        <td>{porcentaje(e.gap_pct)}</td></>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {conAg && res.escenarios.some((e) => e.error_ag) && (
              <Aviso tipo="alerta">{res.escenarios.find((e) => e.error_ag).error_ag}</Aviso>
            )}
          </Tarjeta>

          <div className="columnas">
            <Tarjeta titulo="Rangos de oferta">
              <TablaRangos filas={res.rangos.oferta} unidad="t/sem" />
            </Tarjeta>
            <Tarjeta titulo="Rangos de capacidad">
              <TablaRangos filas={res.rangos.capacidad} unidad="t/sem" />
            </Tarjeta>
          </div>
          <p className="texto-suave nota">Dentro de cada rango la base óptima no cambia y ΔZ* = precio sombra × Δ.</p>

          <Plegable titulo="Rangos de costo unitario por ruta (COP/t)">
            <div className="barra-herramientas">
              <label className="campo campo--check">
                <input type="checkbox" checked={soloBasicas} onChange={(e) => setSoloBasicas(e.target.checked)} />
                Solo rutas en uso
              </label>
              <Boton variante="secundario" onClick={exportarRangos}><Icono nombre="descargar" tamano={16} />CSV</Boton>
            </div>
            <div className="tabla-contenedor">
              <table className="tabla tabla--compacta tabla--numeros">
                <thead><tr><th>Ruta</th><th>En uso</th><th>Flujo (t)</th><th>Costo actual</th><th>Costo reducido</th><th>Mínimo</th><th>Máximo</th></tr></thead>
                <tbody>
                  {!rutas.length && <tr><td colSpan={7} className="celda--vacia">No hay rutas para mostrar con este filtro.</td></tr>}
                  {rutas.map((f) => (
                    <tr key={f.ruta}>
                      <th>{f.ruta}</th><td>{f.basica ? 'Sí' : ''}</td><td>{numero(f.flujo, 1)}</td>
                      <td>{moneda(f.costo_actual)}</td><td>{moneda(f.costo_reducido)}</td>
                      <td>{limite(f.minimo, moneda)}</td><td>{limite(f.maximo, moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Plegable>
        </>
      )}
    </section>
  )
}
