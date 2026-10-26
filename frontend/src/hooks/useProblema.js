// Estado compartido del problema actual (fuentes, plantas, oferta, demanda, costos).
// TODO: migrar a React Context si varias páginas necesitan editarlo.
import { useState } from 'react'

export function useProblema(inicial) {
  const [problema, setProblema] = useState(inicial)
  return { problema, setProblema }
}
