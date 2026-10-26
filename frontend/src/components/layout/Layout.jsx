import { NavLink, Outlet } from 'react-router-dom'
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
  return (
    <div className="layout">
      <nav className="layout__nav">
        <strong className="layout__marca">EcoResiduos</strong>
        {enlaces.map(([ruta, texto]) => (
          <NavLink key={ruta} to={ruta} end={ruta === '/'}>{texto}</NavLink>
        ))}
      </nav>
      <main className="layout__contenido">
        <Outlet />
      </main>
    </div>
  )
}
