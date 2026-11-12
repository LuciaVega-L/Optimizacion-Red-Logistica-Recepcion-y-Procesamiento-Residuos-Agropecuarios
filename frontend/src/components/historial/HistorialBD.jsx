// Tarjeta con lo guardado en la base de datos para el escenario actual (ver useHistorialBD).
import Aviso from '../comunes/Aviso.jsx'
import Boton from '../comunes/Boton.jsx'
import EstadoVacio from '../comunes/EstadoVacio.jsx'
import Icono from '../comunes/Icono.jsx'
import Tarjeta from '../comunes/Tarjeta.jsx'
import { moneda, porcentaje, segundos } from '../../utils/formato.js'

const fecha = (v) => (v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—')
const ms = (v) => (v == null ? null : v / 1000)

export default function HistorialBD({ escenario, sinGuardar, comparativo, resultados, cargando, error, recargar }) {
  return (
    <Tarjeta titulo={`Historial en la base de datos${escenario ? ` · ${escenario}` : ''}`} acciones={
      <Boton variante="fantasma" className="boton--mini" onClick={recargar} cargando={cargando} disabled={!escenario}>
        {!cargando && <Icono nombre="reintentar" tamano={16} />}Actualizar
      </Boton>}>
      {sinGuardar && (
        <Aviso tipo="alerta" titulo="La red tiene cambios sin guardar">
          Las nuevas ejecuciones no se guardarán hasta que guardes la red como escenario en Parametrización.
        </Aviso>
      )}
      {error && <Aviso tipo="error" titulo="No se pudo leer el historial" mensajes={[error]} onReintentar={recargar} />}

      {comparativo && (
        <div className="kpis">
          <Tarjeta destacada titulo="Gap guardado" valor={porcentaje(comparativo.gap_desviacion)}
            detalle="Último AG vs. último exacto" />
          <Tarjeta titulo="Z* exacto" valor={moneda(comparativo.costo_exacto)} detalle={segundos(ms(comparativo.tiempo_exacto_ms))} />
          <Tarjeta titulo="Z AG" valor={moneda(comparativo.costo_genetico)} detalle={segundos(ms(comparativo.tiempo_genetico_ms))} />
        </div>
      )}

      {!error && !resultados.length && !cargando && (
        <EstadoVacio compacto titulo="Sin ejecuciones guardadas"
          descripcion="Cada vez que resuelvas con el modelo exacto o el AG, el resultado se guarda aquí." />
      )}
      {resultados.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla tabla--compacta tabla--numeros">
            <thead><tr><th>Fecha</th><th>Algoritmo</th><th>Costo total</th><th>Tiempo</th><th>Gap</th><th>Factible</th></tr></thead>
            <tbody>{resultados.map((r) => (
              <tr key={r.id}>
                <th>{fecha(r.fecha)}</th><td>{r.algoritmo_utilizado}</td><td>{moneda(r.costo_total)}</td>
                <td>{segundos(ms(r.tiempo_ejecucion_ms))}</td><td>{porcentaje(r.gap_desviacion)}</td>
                <td>{r.factible == null ? '—' : r.factible ? 'Sí' : 'No'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  )
}
