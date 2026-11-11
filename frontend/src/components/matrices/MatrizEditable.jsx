// Tabla editable para una matriz fuentes x plantas (p. ej. distancias en km).
// valores: { [filaId]: { [columnaId]: número } }
export default function MatrizEditable({ filas, columnas, valores, onCambio, unidad, paso = 1 }) {
  return (
    <div className="tabla-contenedor">
      <table className="tabla tabla--compacta">
        <thead>
          <tr>
            <th scope="col">{unidad ? `Empresa \\ Planta (${unidad})` : ''}</th>
            {columnas.map((c) => <th key={c.id} scope="col" title={c.nombre}>{c.id}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id}>
              <th scope="row" title={f.nombre}>{f.id}</th>
              {columnas.map((c) => {
                const v = valores[f.id]?.[c.id]
                const invalido = v === '' || v === undefined || Number(v) < 0
                return (
                  <td key={c.id}>
                    <input type="number" min="0" step={paso} value={v ?? ''}
                      className={invalido ? 'input--error' : ''}
                      aria-invalid={invalido || undefined} required
                      aria-label={`Distancia de ${f.id} a ${c.id}${unidad ? ` en ${unidad}` : ''}`}
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
