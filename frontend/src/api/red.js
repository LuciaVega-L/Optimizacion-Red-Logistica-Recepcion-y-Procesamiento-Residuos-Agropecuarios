import { peticion } from './cliente.js'

export const listarEscenarios = () => peticion('/red/escenarios')
export const obtenerEscenario = (nombre) => peticion(`/red/escenarios/${nombre}`)
