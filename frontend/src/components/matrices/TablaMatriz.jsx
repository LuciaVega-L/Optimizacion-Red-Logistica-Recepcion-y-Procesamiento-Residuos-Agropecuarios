// Matriz de solo lectura (costos, asignación). resaltar(v) marca celdas, p. ej. flujos > 0.
import { numero } from '../../utils/formato.js'

export default function TablaMatriz({ filas, columnas, matriz, formato = numero, resaltar,
  totalesFila, totalesColumna, etiquetaTotalFila = 'Total', etiquetaTotalColumna = 'Total', esquina = '' }) {
  return (
    <div className="tabla-contenedor">
      <table className="tabla tabla--compacta tabla--numeros">
        <thead>
          <tr>
            <th scope="col">{esquina}</th>
            {columnas.map((c) => <th key={c} scope="col">{c}</th>)}
            {totalesFila && <th scope="col">{etiquetaTotalFila}</th>}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f}>
              <th scope="row">{f}</th>
              {matriz[i].map((v, j) => (
                <td key={j} className={resaltar?.(v, i, j) ? 'celda--activa' : ''}>{formato(v)}</td>
              ))}
              {totalesFila && <td className="celda--total">{formato(totalesFila[i])}</td>}
            </tr>
          ))}
        </tbody>
        {totalesColumna && (
          <tfoot>
            <tr>
              <th scope="row">{etiquetaTotalColumna}</th>
              {totalesColumna.map((v, j) => <td key={j} className="celda--total">{formato(v)}</td>)}
              {totalesFila && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
