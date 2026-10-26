export const moneda = (v) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

export const porcentaje = (v) => `${v.toFixed(2)} %`

export const segundos = (v) => `${v.toFixed(3)} s`
