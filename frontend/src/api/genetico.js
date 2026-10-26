import { peticion } from './cliente.js'

export const resolverGenetico = (problema, parametros) =>
  peticion('/genetico/resolver', { metodo: 'POST', cuerpo: { problema, parametros } })
