// Cliente HTTP base. Todas las llamadas al backend pasan por aquí.
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function peticion(ruta, { metodo = 'GET', cuerpo } = {}) {
  let resp
  try {
    resp = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    throw new Error('No se pudo conectar con el backend. ¿Está corriendo uvicorn en el puerto 8000?')
  }
  if (!resp.ok) {
    let detalle = await resp.text()
    try {
      const json = JSON.parse(detalle)
      detalle = typeof json.detail === 'string' ? json.detail
        : Array.isArray(json.detail) ? json.detail.map((d) => d.msg).join(' ') : detalle
    } catch { /* texto plano */ }
    const error = new Error(`Error ${resp.status}: ${detalle}`)
    error.status = resp.status   // p. ej. 503 = base de datos inactiva, 409 = nombre repetido
    error.detalle = detalle
    throw error
  }
  return resp.json()
}
