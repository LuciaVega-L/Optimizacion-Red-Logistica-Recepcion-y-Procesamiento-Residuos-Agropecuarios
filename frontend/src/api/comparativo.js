import { peticion } from './cliente.js'

export const generarReporte = (problema, parametros) =>
  peticion('/comparativo/reporte', { metodo: 'POST', cuerpo: { problema, parametros } })
