import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Icono from '../comunes/Icono.jsx'
import './Layout.css'

const enlaces = [
  ['/', 'Inicio'],
  ['/parametrizacion', 'Parametrización'],
  ['/exacto', 'Modelo exacto'],
  ['/genetico', 'Algoritmo genético'],
  ['/sensibilidad', 'Sensibilidad'],
  ['/comparativo', 'Comparativo'],
]

export default function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { pathname } = useLocation()

  // En móvil el menú se cierra al navegar o con Escape
  useEffect(() => { setMenuAbierto(false) }, [pathname])
  useEffect(() => {
    if (!menuAbierto) return undefined
    const alPulsar = (e) => { if (e.key === 'Escape') setMenuAbierto(false) }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [menuAbierto])

  return (
    <div className="layout">
      <header className="layout__barra">
        <span className="layout__marca">EcoResiduos</span>
        <button type="button" className="menu-boton" aria-expanded={menuAbierto} aria-controls="navegacion"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuAbierto((v) => !v)}>
          <Icono nombre={menuAbierto ? 'cerrar' : 'menu'} tamano={22} />
        </button>
      </header>

      <nav id="navegacion" className={`layout__nav ${menuAbierto ? 'layout__nav--abierto' : ''}`}>
        <span className="layout__marca layout__marca--lateral">EcoResiduos</span>
        {enlaces.map(([ruta, texto]) => (
          <NavLink key={ruta} to={ruta} end={ruta === '/'}>{texto}</NavLink>
        ))}
      </nav>
      {menuAbierto && <div className="layout__velo" onClick={() => setMenuAbierto(false)} aria-hidden="true" />}

      <main className="layout__contenido">
        <Outlet />
      </main>
    </div>
  )
}
