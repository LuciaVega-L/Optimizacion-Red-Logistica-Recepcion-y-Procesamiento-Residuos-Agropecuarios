// Tabla editable para una matriz fuentes x plantas (p. ej. distancias en km).

import Icono from '../comunes/Icono.jsx'

export default function MatrizEditable({ filas, columnas, valores, onCambio, unidad, paso = 1, cerrada, onAlternar }) {
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
                const esCerrada = cerrada?.(f.id, c.id) ?? false
                return (
                  <td key={c.id} className={esCerrada ? 'celda--cerrada' : undefined}>
                    <div className="celda-ruta">
                      <input type="number" min="0" step={paso} value={v ?? ''}
                        className={invalido ? 'input--error' : ''}
                        aria-invalid={invalido || undefined} required
                        aria-label={`Distancia de ${f.id} a ${c.id}${unidad ? ` en ${unidad}` : ''}`}
                        onChange={(e) => onCambio(f.id, c.id, e.target.value === '' ? '' : Number(e.target.value))} />
                      {onAlternar && (
                        <button type="button" className="boton-ruta" aria-pressed={esCerrada}
                          title={esCerrada ? `Abrir la ruta ${f.id}→${c.id}` : `Cerrar la ruta ${f.id}→${c.id}`}
                          aria-label={esCerrada ? `Abrir la ruta ${f.id}→${c.id}` : `Cerrar la ruta ${f.id}→${c.id}`}
                          onClick={() => onAlternar(f.id, c.id)}>
                          <Icono nombre={esCerrada ? 'reintentar' : 'cerrar'} tamano={14} />
                        </button>
                      )}
                    </div>
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
