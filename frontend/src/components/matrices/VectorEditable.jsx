// Tabla editable de entidades (agroempresas o plantas): una fila por entidad.
// columnas: [{ clave, titulo, tipo: 'texto' | 'numero', ancho }]
export default function VectorEditable({ elementos, columnas, onCambio, onEliminar, minimo = 1 }) {
  return (
    <div className="tabla-contenedor">
      <table className="tabla tabla--compacta">
        <thead>
          <tr>{columnas.map((c) => <th key={c.clave}>{c.titulo}</th>)}<th /></tr>
        </thead>
        <tbody>
          {elementos.map((el, k) => (
            <tr key={k}>
              {columnas.map((c) => {
                const v = el[c.clave]
                const invalido = c.tipo === 'numero' ? (v === '' || Number(v) < 0) : !String(v ?? '').trim()
                return (
                  <td key={c.clave}>
                    <input type={c.tipo === 'numero' ? 'number' : 'text'} min="0" value={v ?? ''}
                      style={c.ancho ? { width: c.ancho } : undefined}
                      className={c.obligatorio !== false && invalido ? 'input--error' : ''}
                      aria-label={`${c.titulo} ${el.id}`}
                      onChange={(e) => onCambio(k, c.clave,
                        c.tipo === 'numero' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />
                  </td>
                )
              })}
              <td>
                <button className="boton boton--peligro boton--mini" disabled={elementos.length <= minimo}
                  title="Eliminar" onClick={() => onEliminar(k)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
