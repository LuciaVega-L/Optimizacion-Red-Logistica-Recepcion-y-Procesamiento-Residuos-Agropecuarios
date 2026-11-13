// HU5 — Reporte comparativo exacto vs. AG (caso actual, sensibilidad y escalabilidad) + HU6 exportar.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { compararTamanos } from '../../api/comparativo.js'
import { resolverExacto } from '../../api/exacto.js'
import { resolverGenetico } from '../../api/genetico.js'
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
import GraficaComparativa from '../../components/graficas/GraficaComparativa.jsx'
import HistorialBD from '../../components/historial/HistorialBD.jsx'
import { millones } from '../../components/graficas/registro.js'
import { useNotificaciones } from '../../context/NotificacionesContext.jsx'
import { usePeticion } from '../../hooks/usePeticion.js'
import { useProblema } from '../../hooks/useProblema.js'
import { descargarCSV, exportarPDF } from '../../utils/exportar.js'
import { moneda, numero, porcentaje, segundos } from '../../utils/formato.js'
import { FormularioAG, PARAMETROS_AG_INICIALES } from '../Genetico/Genetico.jsx'

// 100×10 queda opcional: con los parámetros por defecto el AG tarda unos 2,5 min por semilla.
const TAMANOS = [[10, 4], [20, 4], [50, 6]]

// Tiempo aproximado del AG: ~0,25 s por celda (fuente × planta) con población 100 y 500
// generaciones y 3 semillas en paralelo, medido con la app abierta (10×4 + 20×4 + 50×6 ≈ 105 s).
function estimarSegundos(tamanos, parametros, numSemillas, incluirAg) {
  if (!incluirAg) return tamanos.length
  const factor = (Number(parametros.poblacion) * Number(parametros.generaciones)) / 50000
  const tandas = Math.ceil(Math.max(numSemillas, 1) / 4)
  return tamanos.reduce((s, [n, m]) => s + 0.25 * n * m * factor * tandas + 1, 0)
}
const duracion = (seg) => (seg < 60 ? `${Math.max(1, Math.round(seg))} s` : `${Math.round(seg / 60)} min`)
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
  const { notificar } = useNotificaciones()
  const { exacto, genetico, sensibilidad, escalabilidad } = resultados


  const compararActual = () => actual.ejecutar(async () => {
    setErrorAg(null)
    guardarResultado('exacto', await resolverExacto(problema))
    try {
      guardarResultado('genetico', { ...(await resolverGenetico(problema, parametros)), parametros })
    } catch (e) { setErrorAg(e.message) }
    notificar('Comparación de la red actual lista')
    return true
  })

  const listaSemillas = semillas.split(',').map((s) => s.trim()).filter(Boolean).map(Number).filter(Number.isFinite)
  const estimado = estimarSegundos(tamanos, parametros, listaSemillas.length, incluirAg)

  const compararEscala = async () => {
    const lista = listaSemillas
    const r = await escala.ejecutar(() => compararTamanos(tamanos, parametros, incluirAg, lista.length ? lista : [1]))
    if (r) {
      guardarResultado('escalabilidad', r)
      notificar(`Escalabilidad: ${r.length} redes resueltas`)
    }
  }

  const gapActual = gap(genetico?.costo_total, exacto?.costo_total)
  const conAg = sensibilidad?.escenarios.filter((e) => !e.error) ?? []
  const sensConAg = conAg.some((e) => e.genetico)
  const ocupado = actual.cargando || escala.cargando

  const exportarResumen = () => {
    descargarCSV('reporte_comparativo',
      ['Métrica', 'Exacto', 'Algoritmo genético'],
      [['Costo total (COP/sem)', exacto?.costo_total, genetico?.costo_total],
        ['Tiempo (s)', exacto?.tiempo_s, genetico?.tiempo_s],
        ['Factible', exacto?.factible ? 'Sí' : 'No', genetico ? (genetico.factible ? 'Sí' : 'No') : ''],
        ['Gap (%)', 0, gapActual]])
    notificar('CSV del comparativo descargado')
  }

  const exportarEscala = () => {
    descargarCSV('escalabilidad',
      ['Fuentes', 'Plantas', 'Variables', 'Z exacto', 'Tiempo exacto (s)', 'Z AG mejor', 'Z AG promedio',
        'Tiempo AG prom. (s)', 'Gap mejor (%)', 'Gap promedio (%)', 'Corridas factibles'],
      escalabilidad.map((f) => [f.n_fuentes, f.n_plantas, f.variables, f.costo_exacto, f.tiempo_exacto_s,
        f.costo_ag_mejor, f.costo_ag_promedio, f.tiempo_ag_promedio_s, f.gap_mejor_pct, f.gap_promedio_pct,
        f.corridas ? `${f.corridas_factibles}/${f.corridas}` : '']))
    notificar('CSV de escalabilidad descargado')
  }

  return (
    <section>
      <EncabezadoPagina titulo="Reporte comparativo" descripcion="Modelo exacto frente al algoritmo genético: costo, tiempo y gap.">
        <Boton onClick={compararActual} disabled={!problema || escala.cargando} cargando={actual.cargando}>
          {!actual.cargando && <Icono nombre="jugar" tamano={16} />}Comparar red actual
        </Boton>
        <Boton variante="secundario" onClick={exportarPDF} disabled={!exacto}>
          <Icono nombre="descargar" tamano={16} />PDF
        </Boton>
      </EncabezadoPagina>

      {!problema && <SinDatos errores={errores} />}

      <div className="no-imprimir">
        <Plegable titulo="Parámetros del AG usados en el comparativo">
          <FormularioAG valores={parametros} onCambio={setParametros} deshabilitado={ocupado} />
        </Plegable>
      </div>

      <Tarjeta titulo="Red actual" acciones={exacto && <Boton variante="fantasma" className="boton--mini" onClick={exportarResumen}>
        <Icono nombre="descargar" tamano={16} />CSV</Boton>}>
        {actual.cargando && (
          <Cargando texto="Resolviendo con ambos métodos…">
            <EsqueletoKpis cantidad={3} />
            <div className="columnas"><EsqueletoGrafica alto={220} titulo={false} /><EsqueletoGrafica alto={220} titulo={false} /></div>
          </Cargando>
        )}
        {actual.error && !actual.cargando && (
          <Aviso tipo="error" titulo="No se pudo resolver la red" mensajes={[actual.error]} onReintentar={compararActual} />
        )}
        {errorAg && !actual.cargando && <Aviso tipo="alerta" titulo="El AG no terminó; se muestra solo el exacto" mensajes={[errorAg]} />}
        {problema && !exacto && !actual.cargando && !actual.error && (
          <EstadoVacio compacto titulo="Sin comparación todavía"
            descripcion="Pulsa «Comparar red actual» para resolver con ambos métodos." />
        )}
        {exacto && !actual.cargando && (
          <>
            <div className="kpis">
              <Tarjeta destacada titulo="Gap del AG" valor={porcentaje(gapActual)}
                detalle={genetico ? 'Distancia al óptimo exacto' : 'Falta ejecutar el AG'} />
              <Tarjeta titulo="Z* exacto" valor={moneda(exacto.costo_total)} detalle={segundos(exacto.tiempo_s)} />
              <Tarjeta titulo="Z AG" valor={moneda(genetico?.costo_total)}
                detalle={genetico ? `${segundos(genetico.tiempo_s)} · ${genetico.factible ? 'factible' : 'no factible'}` : undefined} />
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

      <Tarjeta titulo="Frente a los escenarios de sensibilidad">
        {!sensConAg && (
          <EstadoVacio compacto titulo={sensibilidad ? 'Los escenarios se simularon sin el AG' : 'Sin escenarios simulados'}
            descripcion="Simula los escenarios con la opción «Resolver también con el algoritmo genético» activada.">
            <Link to="/sensibilidad" className="boton boton--secundario">Ir a Sensibilidad</Link>
          </EstadoVacio>
        )}
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

      <Tarjeta titulo="Escalabilidad en redes sintéticas" acciones={escalabilidad && (
        <Boton variante="fantasma" className="boton--mini" onClick={exportarEscala}><Icono nombre="descargar" tamano={16} />CSV</Boton>)}>
        <div className="no-imprimir">
          <fieldset className="grupo">
            <legend className="subtitulo">Tamaños (fuentes × plantas)</legend>
            <div className="formulario formulario--linea">
              {tamanos.map(([n, m], k) => (
                <span key={k} className="par">
                  <input type="number" min="1" value={n} aria-label={`Fuentes de la red ${k + 1}`} disabled={escala.cargando}
                    onChange={(e) => setTamanos(tamanos.map((t, i) => (i === k ? [Number(e.target.value), t[1]] : t)))} />
                  <span aria-hidden="true">×</span>
                  <input type="number" min="1" value={m} aria-label={`Plantas de la red ${k + 1}`} disabled={escala.cargando}
                    onChange={(e) => setTamanos(tamanos.map((t, i) => (i === k ? [t[0], Number(e.target.value)] : t)))} />
                  <button type="button" className="boton boton--fantasma boton--mini" aria-label={`Quitar red ${n} × ${m}`}
                    disabled={escala.cargando} onClick={() => setTamanos(tamanos.filter((_, i) => i !== k))}>
                    <Icono nombre="cerrar" tamano={16} />
                  </button>
                </span>
              ))}
              <Boton variante="secundario" className="boton--mini" disabled={escala.cargando}
                onClick={() => setTamanos([...tamanos, [100, 10]])}><Icono nombre="mas" tamano={16} />Tamaño</Boton>
            </div>
          </fieldset>
          <div className="formulario formulario--linea">
            <label className="campo">Semillas del AG
              <input value={semillas} onChange={(e) => setSemillas(e.target.value)} disabled={escala.cargando} /></label>
            <label className="campo campo--check">
              <input type="checkbox" checked={incluirAg} onChange={(e) => setIncluirAg(e.target.checked)} disabled={escala.cargando} /> Incluir AG
            </label>
            <Boton onClick={compararEscala} disabled={!tamanos.length || actual.cargando} cargando={escala.cargando}>Medir escalabilidad</Boton>
          </div>
          {tamanos.length > 0 && (
            <p className={estimado > 120 ? 'texto-alerta' : 'texto-suave'}>
              Tiempo estimado: cerca de {duracion(estimado)}.
              {estimado > 120 && ' Para la demostración en vivo conviene quitar las redes grandes o usar una sola semilla.'}
            </p>
          )}
        </div>

        {escala.cargando && (
          <Cargando texto={`Resolviendo redes de distintos tamaños (cerca de ${duracion(estimado)})…`}>
            <EsqueletoTabla filas={4} columnas={9} titulo={false} />
            <EsqueletoGrafica alto={220} titulo={false} />
          </Cargando>
        )}
        {escala.error && !escala.cargando && (
          <Aviso tipo="error" titulo="No se pudo medir la escalabilidad" mensajes={[escala.error]} onReintentar={compararEscala} />
        )}
        {!escalabilidad && !escala.cargando && !escala.error && (
          <EstadoVacio compacto titulo={tamanos.length ? 'Sin resultados de escalabilidad' : 'Agrega al menos un tamaño de red'}
            descripcion="Compara tiempos y gap en redes sintéticas de distintos tamaños." />
        )}
        {escalabilidad && !escala.cargando && (
          <>
            {escalabilidad.some((f) => f.error_ag) && <Aviso tipo="alerta">{escalabilidad.find((f) => f.error_ag).error_ag}</Aviso>}
            <div className="columnas">
              <GraficaComparativa etiquetas={escalabilidad.map((f) => `${f.n_fuentes}×${f.n_plantas}`)}
                exacto={escalabilidad.map((f) => f.tiempo_exacto_s)}
                genetico={escalabilidad.map((f) => f.tiempo_ag_promedio_s ?? null)}
                formato={(v) => `${Number(v).toFixed(3)} s`} tituloEje="Tiempo (s)" logaritmica />
              {escalabilidad.some((f) => f.gap_promedio_pct != null) && <GraficaComparativa etiquetas={escalabilidad.map((f) => `${f.n_fuentes}×${f.n_plantas}`)}
                exacto={escalabilidad.map(() => 0)} genetico={escalabilidad.map((f) => f.gap_promedio_pct ?? null)}
                formato={(v) => `${Number(v).toFixed(2)} %`} tituloEje="Gap promedio (%)" />}
            </div>
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
          </>
        )}
      </Tarjeta>

      <HistorialBD />
    </section>
  )
}
