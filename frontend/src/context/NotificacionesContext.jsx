// Notificaciones breves (toasts) para confirmar que una acción terminó: "Solución lista", "CSV descargado
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Icono from '../components/comunes/Icono.jsx'

const NotificacionesContext = createContext({ notificar: () => {} })
const DURACION_MS = 5000

export function NotificacionesProvider({ children }) {
  const [lista, setLista] = useState([])
  const siguiente = useRef(0)

  const cerrar = useCallback((id) => setLista((l) => l.filter((n) => n.id !== id)), [])
  const notificar = useCallback((mensaje, tipo = 'ok') => {
    const id = ++siguiente.current
    setLista((l) => [...l.slice(-2), { id, mensaje, tipo }])
    setTimeout(() => cerrar(id), DURACION_MS)
  }, [cerrar])

  const valor = useMemo(() => ({ notificar }), [notificar])

  return (
    <NotificacionesContext.Provider value={valor}>
      {children}
      <div className="notificaciones" role="status" aria-live="polite">
        {lista.map((n) => (
          <div key={n.id} className={`notificacion notificacion--${n.tipo}`}>
            <Icono nombre={n.tipo === 'error' ? 'error' : n.tipo === 'alerta' ? 'alerta' : 'ok'} />
            <span>{n.mensaje}</span>
            <button type="button" className="notificacion__cerrar" aria-label="Cerrar notificación" onClick={() => cerrar(n.id)}>
              <Icono nombre="cerrar" tamano={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificacionesContext.Provider>
  )
}

export const useNotificaciones = () => useContext(NotificacionesContext)
