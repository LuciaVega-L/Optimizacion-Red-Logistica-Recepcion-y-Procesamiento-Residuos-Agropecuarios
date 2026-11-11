// Página de inicio: resumen de la red cargada y acceso a cada módulo.
import { Link } from 'react-router-dom'
import Aviso from '../../components/comunes/Aviso.jsx'
import Cargando from '../../components/comunes/Cargando.jsx'
import { EsqueletoGrafica, EsqueletoKpis, EsqueletoTarjetas } from '../../components/comunes/Esqueleto.jsx'
import Tarjeta from '../../components/comunes/Tarjeta.jsx'
import GrafoRed from '../../components/grafo/GrafoRed.jsx'
import { useRed } from '../../context/RedContext.jsx'
import { moneda, numero } from '../../utils/formato.js'

const MODULOS = [
  ['/parametrizacion', 'Parametrización', 'Agroempresas, plantas, distancias y coeficientes (HU1).'],
  ['/exacto', 'Modelo exacto', 'Programación lineal con nodo ficticio, precios sombra y verificación (HU2).'],
  ['/genetico', 'Algoritmo genético', 'Parámetros ajustables y convergencia (HU3).'],
  ['/sensibilidad', 'Sensibilidad', 'Escenarios, precios sombra y rangos de base óptima (HU4).'],
  ['/comparativo', 'Comparativo', 'Costo, tiempo, gap y escalabilidad; exportar CSV/PDF (HU5, HU6).'],
]

export default function Inicio() {
  const { config, cargando, error, balance, problema, resultados } = useRed()
  if (cargando) {
    return (
      <Cargando texto="Cargando la red…">
        <EsqueletoKpis />
        <EsqueletoTarjetas />
        <EsqueletoGrafica alto={360} />
      </Cargando>
    )
  }

  return (
    <section>
      <h1>EcoResiduos del Llano — Optimización de la red logística</h1>
      <p className="texto-suave">Recepción y procesamiento de residuos agropecuarios en el Meta: modelo de transporte exacto vs. algoritmo genético.</p>
      <Aviso tipo="error" mensajes={error ? [error] : []} />

      {config && (
        <div className="kpis">
          <Tarjeta titulo="Agroempresas" valor={config.agroempresas.length} />
          <Tarjeta titulo="Plantas" valor={config.plantas.length} />
          <Tarjeta titulo="Oferta / capacidad" valor={`${numero(balance.oferta)} / ${numero(balance.capacidad)}`} detalle="t/sem" />
          <Tarjeta titulo="Último Z* exacto" valor={resultados.exacto ? moneda(resultados.exacto.costo_total) : '—'} />
        </div>
      )}

      <div className="rejilla">
        {MODULOS.map(([ruta, titulo, texto]) => (
          <Link key={ruta} to={ruta} className="tarjeta tarjeta--enlace">
            <h3 className="tarjeta__titulo">{titulo}</h3><p>{texto}</p>
          </Link>
        ))}
      </div>

      {problema && (
        <Tarjeta titulo="Grafo dirigido G = (V, E)">
          <GrafoRed fuentes={problema.fuentes} plantas={problema.plantas} alto={420} />
        </Tarjeta>
      )}
    </section>
  )
}
