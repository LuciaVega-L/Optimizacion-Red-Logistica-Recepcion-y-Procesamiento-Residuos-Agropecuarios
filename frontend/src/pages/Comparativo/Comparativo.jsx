// HU5 — Reporte comparativo exacto vs. AG (caso actual, sensibilidad y escalabilidad) + HU6 exportar.
import { useState } from 'react'
import { compararTamanos } from '../../api/comparativo.js'
import { resolverExacto } from '../../api/exacto.js'
import { resolverGenetico } from '../../api/genetico.js'
import Aviso from '../../components/comunes/Aviso.jsx'
import Boton from '../../components/comunes/Boton.jsx'
import Cargando from '../../components/comunes/Cargando.jsx'
import SinDatos from '../../components/comunes/SinDatos.jsx'
import Tarjeta from '../../components/comunes/Tarjeta.jsx'
import GraficaComparativa from '../../components/graficas/GraficaComparativa.jsx'
import { millones } from '../../components/graficas/registro.js'
import { usePeticion } from '../../hooks/usePeticion.js'
import { useProblema } from '../../hooks/useProblema.js'
import { descargarCSV, exportarPDF } from '../../utils/exportar.js'
import { moneda, numero, porcentaje, segundos } from '../../utils/formato.js'
import { FormularioAG, PARAMETROS_AG_INICIALES } from '../Genetico/Genetico.jsx'

const TAMANOS = [[10, 4], [20, 4], [50, 6], [100, 10]]
const gap = (ag, ex) => (ag != null && ex ? ((ag - ex) / ex) * 100 : null)

export default function Comparativo() {
  const { problema, errores, resultados, guardarResultado } = useProblema()
  const [parametros, setParametros] = useState(PARAMETROS_AG_INICIALES)
  const [tamanos, setTamanos] = useState(TAMANOS)
  const [semillas, setSemillas] = useState('1, 2, 3')
  const [incluirAg, setIncluirAg] = useState(true)
  const actual = usePeticion()
  const escala = usePeticion()
  const [errorAg, setErrorAg] = useState(null)
  const { exacto, genetico, sensibilidad, escalabilidad } = resultados

  const compararActual = () => actual.ejecutar(async () => {
    setErrorAg(null)
    guardarResultado('exacto', await resolverExacto(problema))
    try {
      guardarResultado('genetico', { ...(await resolverGenetico(problema, parametros)), parametros })
    } catch (e) { setErrorAg(e.message) }
    return true
  })

  const compararEscala = async () => {
    const lista = semillas.split(',').map((s) => Number(s.trim())).filter(Number.isFinite)
    const r = await escala.ejecutar(() => compararTamanos(tamanos, parametros, incluirAg, lista.length ? lista : [1]))
    if (r) guardarResultado('escalabilidad', r)
  }

  const gapActual = gap(genetico?.costo_total, exacto?.costo_total)
  const conAg = sensibilidad?.escenarios.filter((e) => !e.error) ?? []
  const sensConAg = conAg.some((e) => e.genetico)

  const exportarResumen = () => descargarCSV('reporte_comparativo',
    ['Métrica', 'Exacto', 'Algoritmo genético'],
    [['Costo total (COP/sem)', exacto?.costo_total, genetico?.costo_total],
      ['Tiempo (s)', exacto?.tiempo_s, genetico?.tiempo_s],
      ['Factible', exacto?.factible ? 'Sí' : 'No', genetico ? (genetico.factible ? 'Sí' : 'No') : ''],
      ['Gap (%)', 0, gapActual]])

  const exportarEscala = () => descargarCSV('escalabilidad',
    ['Fuentes', 'Plantas', 'Variables', 'Z exacto', 'Tiempo exacto (s)', 'Z AG mejor', 'Z AG promedio',
      'Tiempo AG prom. (s)', 'Gap mejor (%)', 'Gap promedio (%)', 'Corridas factibles'],
    escalabilidad.map((f) => [f.n_fuentes, f.n_plantas, f.variables, f.costo_exacto, f.tiempo_exacto_s,
      f.costo_ag_mejor, f.costo_ag_promedio, f.tiempo_ag_promedio_s, f.gap_mejor_pct, f.gap_promedio_pct,
      f.corridas ? `${f.corridas_factibles}/${f.corridas}` : '']))

  return (
    <section>
      <header className="encabezado">
        <div>
          <h1>Reporte comparativo</h1>
          <p className="texto-suave">Gap (%) = (Z<sub>AG</sub> − Z<sub>exacto</sub>) / Z<sub>exacto</sub> × 100</p>
        </div>
        <div className="acciones no-imprimir">
          <Boton variante="secundario" onClick={exportarPDF}>Exportar PDF</Boton>
        </div>
      </header>

      {!problema && <SinDatos errores={errores} />}

      <Tarjeta titulo="Parámetros del AG para el comparativo" className="no-imprimir">
        <FormularioAG valores={parametros} onCambio={setParametros} />
      </Tarjeta>

      <Tarjeta titulo="1. Red actual">
        <div className="acciones no-imprimir">
          <Boton onClick={compararActual} disabled={!problema || actual.cargando}>Resolver con ambos métodos</Boton>
          {exacto && <Boton variante="secundario" onClick={exportarResumen}>Exportar CSV</Boton>}
        </div>
        {actual.cargando && <Cargando />}
        <Aviso tipo="error" mensajes={actual.error ? [actual.error] : []} />
        <Aviso tipo="alerta" mensajes={errorAg ? [`AG: ${errorAg}`] : []} />
        {exacto && (
          <>
            <div className="tabla-contenedor">
              <table className="tabla tabla--numeros">
                <thead><tr><th>Métrica</th><th>Exacto</th><th>Algoritmo genético</th></tr></thead>
                <tbody>
                  <tr><th>Costo total (COP/sem)</th><td>{moneda(exacto.costo_total)}</td><td>{moneda(genetico?.costo_total)}</td></tr>
                  <tr><th>Tiempo de ejecución</th><td>{segundos(exacto.tiempo_s)}</td><td>{segundos(genetico?.tiempo_s)}</td></tr>
                  <tr><th>Factible</th><td>{exacto.factible ? '✔' : '✘'}</td><td>{genetico ? (genetico.factible ? '✔' : '✘') : '—'}</td></tr>
                  <tr><th>Gap</th><td>0 %</td><td>{porcentaje(gapActual)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="columnas">
              <GraficaComparativa etiquetas={['Costo total']} exacto={[exacto.costo_total]}
                genetico={[genetico?.costo_total ?? null]} formato={millones} tituloEje="COP / semana" />
              <GraficaComparativa etiquetas={['Tiempo']} exacto={[exacto.tiempo_s]}
                genetico={[genetico?.tiempo_s ?? null]} formato={(v) => `${Number(v).toFixed(3)} s`} tituloEje="segundos" />
            </div>
          </>
        )}
      </Tarjeta>

      <Tarjeta titulo="2. Comportamiento ante el análisis de sensibilidad">
        {!sensibilidad && <p className="texto-suave">Ejecuta los escenarios en la página Sensibilidad (marcando “Resolver también con el AG”).</p>}
        {sensibilidad && !sensConAg && <p className="texto-suave">Los escenarios se simularon sin el AG. Vuelve a simular con el AG activado para comparar.</p>}
        {sensConAg && (
          <>
            <GraficaComparativa etiquetas={conAg.map((e) => e.nombre)} exacto={conAg.map((e) => e.costo_total)}
              genetico={conAg.map((e) => e.genetico?.costo_total ?? null)} formato={millones} tituloEje="COP / semana" />
            <div className="tabla-contenedor">
              <table className="tabla tabla--compacta tabla--numeros">
                <thead><tr><th>Escenario</th><th>Z* exacto</th><th>Z AG</th><th>Gap</th><th>Tiempo exacto</th><th>Tiempo AG</th></tr></thead>
                <tbody>{conAg.map((e) => (
                  <tr key={e.nombre}><th>{e.nombre}</th><td>{moneda(e.costo_total)}</td>
                    <td>{moneda(e.genetico?.costo_total)}</td><td>{porcentaje(e.gap_pct)}</td>
                    <td>{segundos(e.tiempo_s)}</td><td>{segundos(e.genetico?.tiempo_s)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </Tarjeta>

      <Tarjeta titulo="3. Escalabilidad (redes sintéticas)">
        <div className="formulario formulario--linea no-imprimir">
          {tamanos.map(([n, m], k) => (
            <span key={k} className="par">
              <input type="number" min="1" value={n} aria-label="Fuentes"
                onChange={(e) => setTamanos(tamanos.map((t, i) => (i === k ? [Number(e.target.value), t[1]] : t)))} />
              ×
              <input type="number" min="1" value={m} aria-label="Plantas"
                onChange={(e) => setTamanos(tamanos.map((t, i) => (i === k ? [t[0], Number(e.target.value)] : t)))} />
              <button className="boton boton--peligro boton--mini" onClick={() => setTamanos(tamanos.filter((_, i) => i !== k))}>✕</button>
            </span>
          ))}
          <Boton variante="secundario" onClick={() => setTamanos([...tamanos, [200, 10]])}>+ Tamaño</Boton>
          <label className="campo">Semillas del AG
            <input value={semillas} onChange={(e) => setSemillas(e.target.value)} /></label>
          <label className="campo campo--check">
            <input type="checkbox" checked={incluirAg} onChange={(e) => setIncluirAg(e.target.checked)} /> Incluir AG
          </label>
          <Boton onClick={compararEscala} disabled={escala.cargando || !tamanos.length}>Ejecutar</Boton>
          {escalabilidad && <Boton variante="secundario" onClick={exportarEscala}>Exportar CSV</Boton>}
        </div>
        {escala.cargando && <Cargando texto="Resolviendo redes de distintos tamaños…" />}
        <Aviso tipo="error" mensajes={escala.error ? [escala.error] : []} />
        {escalabilidad && (
          <>
            {escalabilidad.some((f) => f.error_ag) && <Aviso tipo="alerta">{escalabilidad.find((f) => f.error_ag).error_ag}</Aviso>}
            <div className="tabla-contenedor">
              <table className="tabla tabla--compacta tabla--numeros">
                <thead><tr><th>Red</th><th>Variables</th><th>Z exacto</th><th>Tiempo exacto</th>
                  <th>Z AG (mejor)</th><th>Tiempo AG (prom.)</th><th>Gap mejor</th><th>Gap prom.</th><th>Factibles</th></tr></thead>
                <tbody>{escalabilidad.map((f) => (
                  <tr key={`${f.n_fuentes}x${f.n_plantas}`}>
                    <th>{f.n_fuentes} × {f.n_plantas}</th><td>{numero(f.variables)}</td>
                    <td>{moneda(f.costo_exacto)}</td><td>{segundos(f.tiempo_exacto_s)}</td>
                    <td>{moneda(f.costo_ag_mejor)}</td><td>{segundos(f.tiempo_ag_promedio_s)}</td>
                    <td>{porcentaje(f.gap_mejor_pct)}</td><td>{porcentaje(f.gap_promedio_pct)}</td>
                    <td>{f.corridas ? `${f.corridas_factibles}/${f.corridas}` : '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="columnas">
              <GraficaComparativa etiquetas={escalabilidad.map((f) => `${f.n_fuentes}×${f.n_plantas}`)}
                exacto={escalabilidad.map((f) => f.tiempo_exacto_s)}
                genetico={escalabilidad.map((f) => f.tiempo_ag_promedio_s ?? null)}
                formato={(v) => `${Number(v).toFixed(3)} s`} tituloEje="Tiempo (s)" logaritmica />
              {escalabilidad.some((f) => f.gap_promedio_pct != null) && <GraficaComparativa etiquetas={escalabilidad.map((f) => `${f.n_fuentes}×${f.n_plantas}`)}
                exacto={escalabilidad.map(() => 0)} genetico={escalabilidad.map((f) => f.gap_promedio_pct ?? null)}
                formato={(v) => `${Number(v).toFixed(2)} %`} tituloEje="Gap promedio (%)" />}
            </div>
          </>
        )}
      </Tarjeta>
    </section>
  )
}
