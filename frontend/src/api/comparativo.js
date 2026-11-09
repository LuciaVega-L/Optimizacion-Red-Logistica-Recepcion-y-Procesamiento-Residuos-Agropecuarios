import { peticion } from './cliente.js'

export const generarReporte = (problema, parametros) =>
  peticion('/comparativo/reporte', { metodo: 'POST', cuerpo: { problema, parametros } })

export const compararTamanos = (tamanos, parametrosAg, incluirAg = true, semillasAg = [1, 2, 3]) =>
  peticion('/comparativo/escalabilidad', {
    metodo: 'POST',
    cuerpo: { tamanos, parametros_ag: parametrosAg, incluir_ag: incluirAg, semillas_ag: semillasAg },
  })
