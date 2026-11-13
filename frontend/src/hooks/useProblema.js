// Atajo para las páginas: problema actual  y resultados.
import { useRed } from '../context/RedContext.jsx'

export function useProblema() {
  const { problema, errores, resultados, guardarResultado } = useRed()
  return { problema, errores, resultados, guardarResultado }
}
