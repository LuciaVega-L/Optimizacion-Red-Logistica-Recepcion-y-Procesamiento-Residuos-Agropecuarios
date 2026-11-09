const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export const moneda = (v) =>
  num(v) === null ? '—'
    : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

export const numero = (v, decimales = 0) =>
  num(v) === null ? '—'
    : new Intl.NumberFormat('es-CO', { maximumFractionDigits: decimales }).format(v)

export const porcentaje = (v) => (num(v) === null ? '—' : `${v.toFixed(2)} %`)

export const segundos = (v) => (num(v) === null ? '—' : `${v.toFixed(3)} s`)

// En los rangos de sensibilidad el backend envía null cuando no hay límite.
export const limite = (v, fmt = numero) => (v === null || v === undefined ? '∞' : fmt(v))
