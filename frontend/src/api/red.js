import { peticion } from './cliente.js'

export const listarEscenarios = () => peticion('/red/escenarios')
export const obtenerEscenario = (nombre) => peticion(`/red/escenarios/${encodeURIComponent(nombre)}`)
export const validarProblema = (problema) => peticion('/red/validar', { metodo: 'POST', cuerpo: problema })
