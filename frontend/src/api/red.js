import { peticion } from './cliente.js'

export const listarEscenarios = () => peticion('/escenarios')
export const obtenerEscenario = (nombre) => peticion(`/escenarios/${nombre}`)
export const validarProblema = (problema) => peticion('/validar', { metodo: 'POST', cuerpo: problema })
