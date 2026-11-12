import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Icono from '../comunes/Icono.jsx'
import Logo from './Logo.jsx'
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
  const principal = useRef(null)
  const primeraVez = useRef(true)

  // Al cambiar de pestaña: cerrar el menú móvil, actualizar el título del navegador y llevar
  // el foco al contenido para que los lectores de pantalla anuncien la página nueva.
  useEffect(() => {
    setMenuAbierto(false)
    const actual = enlaces.find(([ruta]) => ruta === pathname)?.[1]
    document.title = actual && pathname !== '/' ? `${actual} · EcoResiduos` : 'EcoResiduos del Llano — Optimización'
    if (primeraVez.current) { primeraVez.current = false; return }
    principal.current?.focus()
  }, [pathname])
  useEffect(() => {
    if (!menuAbierto) return undefined
    const alPulsar = (e) => { if (e.key === 'Escape') setMenuAbierto(false) }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [menuAbierto])

  return (
    <div className="layout">
      <a href="#contenido" className="saltar-enlace">Saltar al contenido</a>
      <header className="layout__barra">
        <span className="layout__marca"><Logo tamano={28} />EcoResiduos</span>
        <button type="button" className="menu-boton" aria-expanded={menuAbierto} aria-controls="navegacion"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuAbierto((v) => !v)}>
          <Icono nombre={menuAbierto ? 'cerrar' : 'menu'} tamano={22} />
        </button>
      </header>

      <nav id="navegacion" aria-label="Principal" className={`layout__nav ${menuAbierto ? 'layout__nav--abierto' : ''}`}>
        <span className="layout__marca layout__marca--lateral">
          <Logo tamano={36} />
          <span className="layout__marca-texto">EcoResiduos<small>del Llano</small></span>
        </span>
        {enlaces.map(([ruta, texto]) => (
          <NavLink key={ruta} to={ruta} end={ruta === '/'}>{texto}</NavLink>
        ))}
      </nav>
      {menuAbierto && <div className="layout__velo" onClick={() => setMenuAbierto(false)} aria-hidden="true" />}

      <main id="contenido" ref={principal} tabIndex={-1} className="layout__contenido">
        <Outlet />
      </main>
    </div>
  )
}
