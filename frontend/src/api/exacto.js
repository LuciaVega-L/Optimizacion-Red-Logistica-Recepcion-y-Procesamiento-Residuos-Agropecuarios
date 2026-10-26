import { peticion } from './cliente.js'

export const resolverExacto = (problema) =>
  peticion('/exacto/resolver', { metodo: 'POST', cuerpo: problema })
