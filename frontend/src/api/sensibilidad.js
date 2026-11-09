import { peticion } from './cliente.js'

export const simularEscenarios = (problema, escenarios, incluirAg = false, parametrosAg = null) =>
  peticion('/sensibilidad/simular', {
    metodo: 'POST',
    cuerpo: { problema, escenarios, incluir_ag: incluirAg, parametros_ag: parametrosAg },
  })

export const obtenerRangos = (problema) =>
  peticion('/sensibilidad/rangos', { metodo: 'POST', cuerpo: problema })

export const escenariosPredefinidos = (problema) =>
  peticion('/sensibilidad/escenarios-predefinidos', { metodo: 'POST', cuerpo: problema })
