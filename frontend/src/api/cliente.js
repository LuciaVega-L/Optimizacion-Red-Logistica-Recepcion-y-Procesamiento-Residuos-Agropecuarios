// Cliente HTTP base. Todas las llamadas al backend pasan por aquí.
const BASE = import.meta.env.VITE_API_URL ?? '/api'

export async function peticion(ruta, { metodo = 'GET', cuerpo } = {}) {
  const resp = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  })
  if (!resp.ok) throw new Error(`Error ${resp.status}: ${await resp.text()}`)
  return resp.json()
}
