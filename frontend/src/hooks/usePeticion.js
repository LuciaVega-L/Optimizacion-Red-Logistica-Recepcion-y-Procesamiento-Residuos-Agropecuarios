import { useState } from 'react'

// Ejecuta una llamada al backend y maneja cargando / error.
export function usePeticion() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const ejecutar = async (fn) => {
    setCargando(true); setError(null)
    try { return await fn() } catch (e) { setError(e.message); return null } finally { setCargando(false) }
  }
  return { cargando, error, ejecutar }
}
