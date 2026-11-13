// Tarjeta con la red en dos vistas: el grafo abstracto (vis-network) o el mapa real (Leaflet).
import { useState } from 'react'
import Tarjeta from '../comunes/Tarjeta.jsx'
import GrafoRed from './GrafoRed.jsx'
import MapaRed from './MapaRed.jsx'

const CLAVE = 'ecoresiduos.vistaRed'
const leer = () => { try { return localStorage.getItem(CLAVE) === 'mapa' ? 'mapa' : 'grafo' } catch { return 'grafo' } }

export default function VistaRed({ titulo, ...props }) {
  const [vista, setVista] = useState(leer)
  const cambiar = (v) => {
    setVista(v)
    try { localStorage.setItem(CLAVE, v) } catch { /* sin almacenamiento */ }
  }
  const selector = (
    <div className="selector-vista" role="group" aria-label="Vista de la red">
      {[['grafo', 'Grafo'], ['mapa', 'Mapa']].map(([v, texto]) => (
        <button key={v} type="button" aria-pressed={vista === v}
          className={`selector-vista__opcion ${vista === v ? 'selector-vista__opcion--activa' : ''}`}
          onClick={() => cambiar(v)}>{texto}</button>
      ))}
    </div>
  )
  return (
    <Tarjeta titulo={titulo} acciones={selector}>
      {vista === 'mapa' ? <MapaRed {...props} /> : <GrafoRed {...props} />}
    </Tarjeta>
  )
}
