// HU4 — Análisis de sensibilidad: precios sombra, rangos de base óptima y escenarios.
import { useEffect, useState } from 'react'
import { escenariosPredefinidos, simularEscenarios } from '../../api/sensibilidad.js'
import Aviso from '../../components/comunes/Aviso.jsx'
import Boton from '../../components/comunes/Boton.jsx'
import Cargando from '../../components/comunes/Cargando.jsx'
import { EsqueletoGrafica, EsqueletoTabla } from '../../components/comunes/Esqueleto.jsx'
import SinDatos from '../../components/comunes/SinDatos.jsx'
import Tarjeta from '../../components/comunes/Tarjeta.jsx'
import GraficaSensibilidad from '../../components/graficas/GraficaSensibilidad.jsx'
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
        <thead><tr><th>Nodo</th><th>Actual ({unidad})</th><th>Precio sombra (COP/t)</th><th>Mínimo</th><th>Máximo</th></tr></thead>
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
  const res = resultados.sensibilidad

  useEffect(() => {
    if (problema && !escenarios.length) escenariosPredefinidos(problema).then(setEscenarios).catch(() => {})
  }, [problema]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!problema) return <section><h1>Análisis de sensibilidad</h1><SinDatos errores={errores} /></section>

  const agregar = () => {
    const nombre = nuevo.nombre.trim() || `Escenario ${escenarios.length + 1}`
    setEscenarios([...escenarios, aEscenario({ ...nuevo, nombre })])
    setNuevo(NUEVO)
  }

  const simular = async () => {
    const r = await ejecutar(() => simularEscenarios(problema, escenarios, incluirAg, parametrosAg))
    if (r) guardarResultado('sensibilidad', r)
  }

  const exportar = () => descargarCSV('sensibilidad_escenarios',
    ['Escenario', 'Cambios', 'Z* exacto (COP/sem)', 'Variación (COP)', 'Variación (%)', '¿Misma base?',
      'Z AG (COP/sem)', 'Gap AG (%)', 'Error'],
    res.escenarios.map((e) => [e.nombre ?? e.escenario.nombre, describir(e.escenario), e.costo_total,
      e.variacion_costo, e.variacion_costo_pct, e.base_optima_se_mantiene ? 'Sí' : 'No',
      e.genetico?.costo_total, e.gap_pct, e.error ?? e.error_ag]))

  const objetivos = nuevo.tipo === 'oferta' ? problema.fuentes : nuevo.tipo === 'capacidad' ? problema.plantas : []

  return (
    <section>
      <header className="encabezado">
        <div>
          <h1>Análisis de sensibilidad</h1>
          <p className="texto-suave">El escenario original no se modifica: cada simulación trabaja sobre una copia.</p>
        </div>
        <div className="acciones">
          <Boton onClick={simular} disabled={cargando || !escenarios.length}>Simular escenarios</Boton>
          {res && <Boton variante="secundario" onClick={exportar}>Exportar CSV</Boton>}
        </div>
      </header>

      <Tarjeta titulo="Escenarios a simular">
        <div className="tabla-contenedor">
          <table className="tabla tabla--compacta">
            <thead><tr><th>Nombre</th><th>Cambios</th><th /></tr></thead>
            <tbody>
              {escenarios.map((e, k) => (
                <tr key={k}><td>{e.nombre}</td><td>{describir(e)}</td>
                  <td><button className="boton boton--peligro boton--mini" title="Quitar"
                    onClick={() => setEscenarios(escenarios.filter((_, i) => i !== k))}>✕</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="formulario formulario--linea">
          <label className="campo">Nombre
            <input value={nuevo.nombre} placeholder="p. ej. Paro camionero"
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} /></label>
          <label className="campo">Parámetro
            <select value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value, objetivo: '' })}>
              <option value="costos">Costo de transporte / combustible</option>
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
          <Boton variante="secundario" onClick={agregar}>+ Agregar</Boton>
        </div>
        <label className="campo campo--check">
          <input type="checkbox" checked={incluirAg} onChange={(e) => setIncluirAg(e.target.checked)} />
          Resolver también cada escenario con el algoritmo genético
        </label>
        {incluirAg && <FormularioAG valores={parametrosAg} onCambio={setParametrosAg} />}
      </Tarjeta>

      {cargando && (
        <Cargando texto="Simulando escenarios…">
          <EsqueletoGrafica alto={220} />
          <div className="columnas"><EsqueletoTabla columnas={5} /><EsqueletoTabla columnas={5} /></div>
        </Cargando>
      )}
      <Aviso tipo="error" mensajes={error ? [error] : []} />

      {res && !cargando && (
        <>
          <Tarjeta titulo={`Resultados (caso base: ${moneda(res.base.costo_total)} / semana)`}>
            <GraficaSensibilidad escenarios={res.escenarios} />
            <div className="tabla-contenedor">
              <table className="tabla tabla--compacta tabla--numeros">
                <thead><tr><th>Escenario</th><th>Z* exacto</th><th>Δ Z*</th><th>Δ %</th><th>¿Misma base?</th>
                  {incluirAg && <><th>Z AG</th><th>Gap AG</th></>}</tr></thead>
                <tbody>
                  {res.escenarios.map((e, k) => e.error ? (
                    <tr key={k}><th>{e.escenario.nombre}</th><td colSpan={6} className="texto-error">{e.error}</td></tr>
                  ) : (
                    <tr key={k}>
                      <th title={describir(e.escenario)}>{e.nombre}</th>
                      <td>{moneda(e.costo_total)}</td><td>{moneda(e.variacion_costo)}</td>
                      <td>{porcentaje(e.variacion_costo_pct)}</td>
                      <td className={e.base_optima_se_mantiene ? 'texto-ok' : 'texto-alerta'}>
                        {e.base_optima_se_mantiene ? '✔ Sí' : 'Cambia'}</td>
                      {incluirAg && <>
                        <td title={e.error_ag ?? ''}>{e.genetico ? moneda(e.genetico.costo_total) : 'N/D'}</td>
                        <td>{porcentaje(e.gap_pct)}</td></>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {incluirAg && res.escenarios.some((e) => e.error_ag) && (
              <Aviso tipo="alerta">{res.escenarios.find((e) => e.error_ag).error_ag}</Aviso>
            )}
          </Tarjeta>

          <div className="columnas">
            <Tarjeta titulo="Rangos de oferta (sin cambiar la base óptima)">
              <TablaRangos filas={res.rangos.oferta} unidad="t/sem" />
            </Tarjeta>
            <Tarjeta titulo="Rangos de capacidad (sin cambiar la base óptima)">
              <TablaRangos filas={res.rangos.capacidad} unidad="t/sem" />
              <p className="texto-suave">Dentro del rango, ΔZ* = precio sombra × Δ.</p>
            </Tarjeta>
          </div>

          <Tarjeta titulo="Rangos de costo unitario por ruta (COP/t)">
            <label className="campo campo--check">
              <input type="checkbox" checked={soloBasicas} onChange={(e) => setSoloBasicas(e.target.checked)} />
              Mostrar solo rutas básicas (en uso)
            </label>
            <div className="tabla-contenedor">
              <table className="tabla tabla--compacta tabla--numeros">
                <thead><tr><th>Ruta</th><th>Básica</th><th>Flujo (t)</th><th>Costo actual</th><th>Costo reducido</th><th>Mínimo</th><th>Máximo</th></tr></thead>
                <tbody>
                  {res.rangos.costos.filter((f) => !soloBasicas || f.basica).map((f) => (
                    <tr key={f.ruta}>
                      <th>{f.ruta}</th><td>{f.basica ? '✔' : ''}</td><td>{numero(f.flujo, 1)}</td>
                      <td>{moneda(f.costo_actual)}</td><td>{moneda(f.costo_reducido)}</td>
                      <td>{limite(f.minimo, moneda)}</td><td>{limite(f.maximo, moneda)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Boton variante="secundario" onClick={() => descargarCSV('rangos_costos',
              ['Ruta', 'Básica', 'Flujo', 'Costo actual', 'Costo reducido', 'Mínimo', 'Máximo'],
              res.rangos.costos.map((f) => [f.ruta, f.basica ? 'Sí' : 'No', f.flujo, f.costo_actual,
                f.costo_reducido, f.minimo, f.maximo ?? '∞']))}>Exportar rangos CSV</Boton>
          </Tarjeta>
        </>
      )}
    </section>
  )
}
