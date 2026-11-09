// Atajo para las páginas: problema actual (o null si la red tiene errores) y resultados.
import { useRed } from '../context/RedContext.jsx'

export function useProblema() {
  const { problema, errores, resultados, guardarResultado } = useRed()
  return { problema, errores, resultados, guardarResultado }
}
