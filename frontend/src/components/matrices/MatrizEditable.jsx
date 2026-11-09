// Tabla editable para una matriz fuentes x plantas (p. ej. distancias en km).
// valores: { [filaId]: { [columnaId]: número } }
export default function MatrizEditable({ filas, columnas, valores, onCambio, unidad, paso = 1 }) {
  return (
    <div className="tabla-contenedor">
      <table className="tabla tabla--compacta">
        <thead>
          <tr>
            <th>{unidad ? `Empresa \\ Planta (${unidad})` : ''}</th>
            {columnas.map((c) => <th key={c.id} title={c.nombre}>{c.id}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id}>
              <th title={f.nombre}>{f.id}</th>
              {columnas.map((c) => {
                const v = valores[f.id]?.[c.id]
                const invalido = v === '' || v === undefined || Number(v) < 0
                return (
                  <td key={c.id}>
                    <input type="number" min="0" step={paso} value={v ?? ''}
                      className={invalido ? 'input--error' : ''}
                      aria-label={`${f.id} a ${c.id}`}
                      onChange={(e) => onCambio(f.id, c.id, e.target.value === '' ? '' : Number(e.target.value))} />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
