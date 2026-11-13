// Historial guardado en la base de datos:
//  - por escenario, el último exacto frente al último AG (vista v_historial_comparativo: la
//    base ya calcula el gap), y
//  - las últimas ejecuciones guardadas, de la más reciente a la más antigua.
// Sin base de datos muestra solo un aviso.
import { useEffect, useState } from 'react'
import { listarResultados, obtenerComparativo } from '../../api/historial.js'
import { useBD } from '../../hooks/useBD.js'
import { moneda, porcentaje } from '../../utils/formato.js'
import Aviso from '../comunes/Aviso.jsx'
import Boton from '../comunes/Boton.jsx'
import EstadoVacio from '../comunes/EstadoVacio.jsx'
import Icono from '../comunes/Icono.jsx'
import Tarjeta from '../comunes/Tarjeta.jsx'

const fecha = (v) => (v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—')
const ms = (v) => (v == null ? '—' : v < 1000 ? `${Math.round(v)} ms` : `${(v / 1000).toFixed(2)} s`)

export default function HistorialBD({ limite = 10 }) {
  const bd = useBD()
  const [datos, setDatos] = useState({ comparativo: [], ultimos: [] })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const cargar = async () => {
    setCargando(true); setError(null)
    try {
      const [comparativo, ultimos] = await Promise.all([obtenerComparativo(), listarResultados({ limite })])
      setDatos({ comparativo, ultimos })
    } catch (e) { setError(e.message) } finally { setCargando(false) }
  }
  useEffect(() => { if (bd.activa) cargar() }, [bd.activa])  // eslint-disable-line react-hooks/exhaustive-deps

  if (bd.activa === false) {
    return (
      <Tarjeta titulo="Historial en la base de datos">
        <p className="texto-suave">El historial necesita la base de datos (FUENTE_DATOS=bd en backend/.env).</p>
      </Tarjeta>
    )
  }

  const conResultados = datos.comparativo.filter((f) => f.costo_exacto != null || f.costo_genetico != null)

  return (
    <Tarjeta titulo="Historial en la base de datos" acciones={
      <Boton variante="fantasma" className="boton--mini" onClick={cargar} cargando={cargando} disabled={!bd.activa}>
        <Icono nombre="reintentar" tamano={16} />Actualizar
      </Boton>}>
      {error && <Aviso tipo="error" titulo="No se pudo leer el historial" mensajes={[error]} onReintentar={cargar} />}
      {!error && !cargando && bd.activa && !datos.ultimos.length && (
        <EstadoVacio compacto titulo="Todavía no hay resultados guardados"
          descripcion="Resuelve en Modelo exacto o Algoritmo genético y pulsa «Guardar en historial»." />
      )}

      {conResultados.length > 0 && (
        <>
          <h3 className="subtitulo">Último exacto vs. último AG por escenario</h3>
          <div className="tabla-contenedor">
            <table className="tabla tabla--compacta tabla--numeros">
              <thead>
                <tr>
                  <th scope="col">Escenario</th><th scope="col">Z* exacto</th><th scope="col">Z AG</th>
                  <th scope="col">Gap</th><th scope="col">Tiempo exacto</th><th scope="col">Tiempo AG</th>
                  <th scope="col">Último resultado</th>
                </tr>
              </thead>
              <tbody>
                {conResultados.map((f) => (
                  <tr key={f.escenario_id}>
                    <th scope="row">{f.escenario}</th>
                    <td>{moneda(f.costo_exacto)}</td><td>{moneda(f.costo_genetico)}</td>
                    <td>{porcentaje(f.gap_desviacion)}</td>
                    <td>{ms(f.tiempo_exacto_ms)}</td><td>{ms(f.tiempo_genetico_ms)}</td>
                    <td>{fecha(f.fecha_ultimo_resultado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {datos.ultimos.length > 0 && (
        <>
          <h3 className="subtitulo">Últimas {datos.ultimos.length} ejecuciones guardadas</h3>
          <div className="tabla-contenedor">
            <table className="tabla tabla--compacta tabla--numeros">
              <thead>
                <tr>
                  <th scope="col">Fecha</th><th scope="col">Escenario</th><th scope="col">Algoritmo</th>
                  <th scope="col">Costo (COP/sem)</th><th scope="col">Tiempo</th><th scope="col">Gap</th>
                  <th scope="col">Factible</th>
                </tr>
              </thead>
              <tbody>
                {datos.ultimos.map((r) => (
                  <tr key={r.id}>
                    <td>{fecha(r.fecha)}</td><th scope="row">{r.escenario}</th><td>{r.algoritmo_utilizado}</td>
                    <td>{moneda(r.costo_total)}</td><td>{ms(r.tiempo_ejecucion_ms)}</td>
                    <td>{r.algoritmo_utilizado === 'Exacto' ? '—' : porcentaje(r.gap_desviacion)}</td>
                    <td>{r.factible == null ? '—' : r.factible ? 'Sí' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Tarjeta>
  )
}
