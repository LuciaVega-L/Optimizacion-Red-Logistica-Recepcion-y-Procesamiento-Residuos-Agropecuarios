// Tabla editable de entidades (agroempresas o plantas): una fila por entidad.
// columnas: [{ clave, titulo, tipo: 'texto' | 'numero', ancho }]
import Icono from '../comunes/Icono.jsx'

export default function VectorEditable({ elementos, columnas, onCambio, onEliminar, minimo = 1 }) {
  return (
    <div className="tabla-contenedor">
      <table className="tabla tabla--compacta">
        <thead>
          <tr>
            {columnas.map((c) => <th key={c.clave} scope="col">{c.titulo}</th>)}
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {elementos.map((el, k) => (
            <tr key={k}>
              {columnas.map((c) => {
                const v = el[c.clave]
                const invalido = c.obligatorio !== false &&
                  (c.tipo === 'numero' ? (v === '' || Number(v) < 0) : !String(v ?? '').trim())
                return (
                  <td key={c.clave}>
                    <input type={c.tipo === 'numero' ? 'number' : 'text'} min="0" value={v ?? ''}
                      style={c.ancho ? { width: c.ancho } : undefined}
                      className={invalido ? 'input--error' : ''}
                      aria-invalid={invalido || undefined}
                      required={c.obligatorio !== false}
                      aria-label={`${c.titulo} de ${el.id || `la fila ${k + 1}`}`}
                      onChange={(e) => onCambio(k, c.clave,
                        c.tipo === 'numero' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />
                  </td>
                )
              })}
              <td>
                <button type="button" className="boton boton--peligro boton--mini" disabled={elementos.length <= minimo}
                  aria-label={`Eliminar ${el.id || `la fila ${k + 1}`}`} title="Eliminar" onClick={() => onEliminar(k)}>
                  <Icono nombre="cerrar" tamano={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
