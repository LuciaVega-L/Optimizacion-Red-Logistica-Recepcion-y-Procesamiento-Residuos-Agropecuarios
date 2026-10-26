import { peticion } from './cliente.js'

export const simularEscenarios = (problema, escenarios) =>
  peticion('/sensibilidad/simular', { metodo: 'POST', cuerpo: { problema, escenarios } })
