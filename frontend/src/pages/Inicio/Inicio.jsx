// Página de inicio: resumen de la red cargada y acceso a cada módulo.
import { Link } from 'react-router-dom'
import Aviso from '../../components/comunes/Aviso.jsx'
import Cargando from '../../components/comunes/Cargando.jsx'
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina.jsx'
import { EsqueletoGrafica, EsqueletoKpis, EsqueletoTarjetas } from '../../components/comunes/Esqueleto.jsx'
import Icono from '../../components/comunes/Icono.jsx'
import Tarjeta from '../../components/comunes/Tarjeta.jsx'
import VistaRed from '../../components/grafo/VistaRed.jsx'
import { useRed } from '../../context/RedContext.jsx'
import { moneda, numero } from '../../utils/formato.js'

const MODULOS = [
  ['/parametrizacion', 'Parametrización', 'Agroempresas, plantas y distancias.'],
  ['/exacto', 'Modelo exacto', 'Costo mínimo y precios sombra.'],
  ['/genetico', 'Algoritmo genético', 'Parámetros y convergencia.'],
  ['/sensibilidad', 'Sensibilidad', 'Escenarios y rangos de la base óptima.'],
  ['/comparativo', 'Comparativo', 'Costo, tiempo, gap y escalabilidad.'],
]

export default function Inicio() {
  const { config, cargando, error, balance, problema, errores, resultados, cargarEscenario } = useRed()
  if (cargando) {
    return (
      <Cargando texto="Cargando la red…">
        <EsqueletoKpis />
        <EsqueletoTarjetas />
        <EsqueletoGrafica alto={360} />
      </Cargando>
    )
  }

  const z = resultados.exacto?.costo_total

  return (
    <section>
      <EncabezadoPagina titulo="Red logística EcoResiduos"
        descripcion="Transporte semanal de residuos agropecuarios desde las agroempresas del Meta hasta las plantas.">
        {problema
          ? <Link to="/exacto" className="boton boton--primario"><Icono nombre="jugar" tamano={16} />Resolver la red</Link>
          : config && <Link to="/parametrizacion" className="boton boton--primario"><Icono nombre="editar" tamano={16} />Corregir la red</Link>}
        <Link to="/parametrizacion" className="boton boton--secundario">Editar datos</Link>
      </EncabezadoPagina>

      {error && <Aviso tipo="error" titulo="No se pudo cargar la red" mensajes={[error]} onReintentar={() => cargarEscenario()} />}
      {config && errores.length > 0 && (
        <Aviso tipo="alerta" titulo={`La red tiene ${errores.length} ${errores.length === 1 ? 'dato' : 'datos'} por corregir`}>
          <p>No se puede resolver hasta corregirlos en <Link to="/parametrizacion">Parametrización</Link>.</p>
        </Aviso>
      )}

      {config && (
        <div className="kpis">
          <Tarjeta destacada titulo="Último Z* exacto" valor={z ? moneda(z) : '—'}
            detalle={z ? 'COP por semana' : <Link to="/exacto">Aún sin resolver</Link>} />
          <Tarjeta titulo="Agroempresas" valor={config.agroempresas.length} />
          <Tarjeta titulo="Plantas" valor={config.plantas.length} />
          <Tarjeta titulo="Oferta / capacidad" valor={`${numero(balance.oferta)} / ${numero(balance.capacidad)}`} detalle="t/sem" />
        </div>
      )}

      <h2 className="seccion-titulo">Módulos</h2>
      <nav className="rejilla" aria-label="Módulos">
        {MODULOS.map(([ruta, titulo, texto]) => (
          <Link key={ruta} to={ruta} className="tarjeta tarjeta--enlace">
            <span className="tarjeta__titulo">{titulo}</span>
            <span className="tarjeta__detalle">{texto}</span>
          </Link>
        ))}
      </nav>

      {problema && (
        <VistaRed titulo="Red logística" fuentes={problema.fuentes} plantas={problema.plantas} alto={420} />
      )}
    </section>
  )
}
