import { peticion } from './cliente.js'

// Con base de datos activa, /escenarios devuelve objetos con id, nombre y es_base
// (para marcar el caso base en la lista). Sin base de datos responde 503, y entonces
// se usa /red/escenarios, que devuelve solo los nombres leídos de los archivos.
export const listarEscenarios = () =>
  peticion('/escenarios').catch(() => peticion('/red/escenarios'))

export const obtenerEscenario = (nombre) => peticion(`/red/escenarios/${encodeURIComponent(nombre)}`)
export const validarProblema = (problema) => peticion('/red/validar', { metodo: 'POST', cuerpo: problema })
