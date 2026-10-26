import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import Inicio from './pages/Inicio/Inicio.jsx'
import Parametrizacion from './pages/Parametrizacion/Parametrizacion.jsx'
import Exacto from './pages/Exacto/Exacto.jsx'
import Genetico from './pages/Genetico/Genetico.jsx'
import Sensibilidad from './pages/Sensibilidad/Sensibilidad.jsx'
import Comparativo from './pages/Comparativo/Comparativo.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="parametrizacion" element={<Parametrizacion />} />
        <Route path="exacto" element={<Exacto />} />
        <Route path="genetico" element={<Genetico />} />
        <Route path="sensibilidad" element={<Sensibilidad />} />
        <Route path="comparativo" element={<Comparativo />} />
      </Route>
    </Routes>
  )
}
