// HU1 — Parametrización dinámica de la red: agroempresas, plantas, distancias y coeficientes.
import { useEffect, useState } from 'react'
import { listarEscenarios } from '../../api/red.js'
import Aviso from '../../components/comunes/Aviso.jsx'
import Boton from '../../components/comunes/Boton.jsx'
import Cargando from '../../components/comunes/Cargando.jsx'
import { EsqueletoKpis, EsqueletoTabla } from '../../components/comunes/Esqueleto.jsx'
import Tarjeta from '../../components/comunes/Tarjeta.jsx'
import MatrizEditable from '../../components/matrices/MatrizEditable.jsx'
import TablaMatriz from '../../components/matrices/TablaMatriz.jsx'
import VectorEditable from '../../components/matrices/VectorEditable.jsx'
import { useRed } from '../../context/RedContext.jsx'
import { useNotificaciones } from '../../context/NotificacionesContext.jsx'
import { moneda, numero } from '../../utils/formato.js'
import { siguienteId } from '../../utils/red.js'

const COLS_EMPRESAS = [
  { clave: 'id', titulo: 'Id', ancho: '4.5rem' },
  { clave: 'nombre', titulo: 'Nombre', ancho: '12rem' },
  { clave: 'municipio', titulo: 'Municipio', ancho: '9rem', obligatorio: false },
  { clave: 'sector', titulo: 'Sector', ancho: '8rem', obligatorio: false },
  { clave: 'oferta_ton_sem', titulo: 'Oferta (t/sem)', tipo: 'numero', ancho: '6rem' },
]
const COLS_PLANTAS = [
  { clave: 'id', titulo: 'Id', ancho: '4.5rem' },
  { clave: 'nombre', titulo: 'Nombre', ancho: '12rem' },
  { clave: 'municipio', titulo: 'Municipio', ancho: '9rem', obligatorio: false },
  { clave: 'capacidad_maxima_ton_sem', titulo: 'Capacidad (t/sem)', tipo: 'numero', ancho: '6rem' },
  { clave: 'costo_operativo_ton', titulo: 'Costo operativo (COP/t)', tipo: 'numero', ancho: '8rem' },
]

export default function Parametrizacion() {
  const { config, cargando, error, errores, problema, balance, actualizarConfig, cargarEscenario } = useRed()
  const [escenarios, setEscenarios] = useState([])
  const [seleccion, setSeleccion] = useState('dataConfig')
  const [errorLista, setErrorLista] = useState(false)
  const [cargandoEscenario, setCargandoEscenario] = useState(false)
  const { notificar } = useNotificaciones()

  useEffect(() => {
    listarEscenarios().then(setEscenarios).catch(() => { setEscenarios([]); setErrorLista(true) })
  }, [])

  const cargar = async () => {
    if (!window.confirm('Se reemplazarán los cambios actuales por el escenario seleccionado. ¿Continuar?')) return
    setCargandoEscenario(true)
    if (await cargarEscenario(seleccion)) notificar(`Escenario «${seleccion}» cargado`)
    setCargandoEscenario(false)
  }

  if (cargando) {
    return (
      <Cargando texto="Cargando la red…">
        <EsqueletoKpis />
        <EsqueletoTabla filas={5} columnas={6} />
        <EsqueletoTabla filas={4} columnas={6} />
      </Cargando>
    )
  }
  if (!config) {
    return <Aviso tipo="error" titulo="No se pudo cargar la red" mensajes={[error ?? 'El servidor no devolvió datos.']}
      onReintentar={() => cargarEscenario()} />
  }

  const cambiarEntidad = (lista) => (k, clave, valor) => actualizarConfig((c) => {
    const anterior = c[lista][k].id
    c[lista][k][clave] = valor
    if (clave === 'id' && anterior !== valor) {        // renombrar también en la matriz de distancias
      const d = c.matriz_distancias_km
      if (lista === 'agroempresas') { d[valor] = d[anterior] ?? {}; delete d[anterior] }
      else Object.values(d).forEach((fila) => { fila[valor] = fila[anterior]; delete fila[anterior] })
    }
    return c
  })

  const agregarEmpresa = () => actualizarConfig((c) => {
    const id = siguienteId(c.agroempresas, 'E', 2)
    c.agroempresas.push({ id, nombre: `Nueva agroempresa ${id}`, municipio: '', sector: '', oferta_ton_sem: 0 })
    c.matriz_distancias_km[id] = Object.fromEntries(c.plantas.map((p) => [p.id, '']))
    return c
  })
  const agregarPlanta = () => actualizarConfig((c) => {
    const id = siguienteId(c.plantas, 'P', 1)
    c.plantas.push({ id, nombre: `Nueva planta ${id}`, municipio: '', capacidad_maxima_ton_sem: 0, costo_operativo_ton: 0 })
    c.agroempresas.forEach((e) => { c.matriz_distancias_km[e.id][id] = '' })
    return c
  })
  const eliminarEmpresa = (k) => actualizarConfig((c) => {
    const [e] = c.agroempresas.splice(k, 1)
    delete c.matriz_distancias_km[e.id]
    return c
  })
  const eliminarPlanta = (k) => actualizarConfig((c) => {
    const [p] = c.plantas.splice(k, 1)
    Object.values(c.matriz_distancias_km).forEach((fila) => delete fila[p.id])
    return c
  })

  return (
    <section>
      <header className="encabezado">
        <div>
          <h1>Parametrización de la red</h1>
          <p className="texto-suave">Los cambios se guardan en este navegador y se usan en todos los módulos.</p>
        </div>
        <div className="acciones">
          <select value={seleccion} onChange={(e) => setSeleccion(e.target.value)} aria-label="Escenario">
            {(escenarios.length ? escenarios : [{ id: 'dataConfig', nombre: 'dataConfig' }]).map((esc) => {
              const nombre = typeof esc === 'string' ? esc : esc.nombre   // acepta ambos formatos
              const clave = typeof esc === 'string' ? esc : esc.id
              return (
                <option key={clave} value={nombre}>
                  {nombre}{esc.es_base ? ' (base)' : ''}
                </option>
              )
            })}
          </select>
          <Boton variante="secundario" onClick={cargar} cargando={cargandoEscenario}>Cargar escenario</Boton>
        </div>
      </header>

      <div className="kpis">
        <Tarjeta titulo="Agroempresas" valor={config.agroempresas.length} />
        <Tarjeta titulo="Plantas" valor={config.plantas.length} />
        <Tarjeta titulo="Oferta total" valor={`${numero(balance.oferta)} t/sem`} />
        <Tarjeta titulo="Capacidad total" valor={`${numero(balance.capacidad)} t/sem`} />
      </div>

      <Aviso tipo={balance.estado === 'balanceado' ? 'ok' : 'info'} titulo="Balance de la red">{balance.texto}</Aviso>
      {error && <Aviso tipo="error" titulo="No se pudo cargar el escenario" mensajes={[error]} />}
      {errorLista && <Aviso tipo="alerta" mensajes={['No se pudo obtener la lista de escenarios; solo está disponible el caso base.']} />}
      <Aviso tipo="error" titulo="Errores en los datos" mensajes={errores} />

      <Tarjeta titulo="Coeficientes globales">
        <label className="campo">
          Costo de transporte (COP por km·tonelada)
          <input type="number" min="0" value={config.parametros_globales.costo_transporte_km_ton}
            onChange={(e) => actualizarConfig((c) => {
              c.parametros_globales.costo_transporte_km_ton = e.target.value === '' ? '' : Number(e.target.value)
              return c
            })} />
        </label>
        <p className="texto-suave">c<sub>ij</sub> = d<sub>ij</sub> × costo km·t + costo operativo<sub>j</sub></p>
      </Tarjeta>

      <Tarjeta titulo="Agroempresas (fuentes)">
        <VectorEditable elementos={config.agroempresas} columnas={COLS_EMPRESAS}
          onCambio={cambiarEntidad('agroempresas')} onEliminar={eliminarEmpresa} />
        <Boton variante="secundario" onClick={agregarEmpresa}>+ Agregar agroempresa</Boton>
      </Tarjeta>

      <Tarjeta titulo="Plantas (destinos)">
        <VectorEditable elementos={config.plantas} columnas={COLS_PLANTAS}
          onCambio={cambiarEntidad('plantas')} onEliminar={eliminarPlanta} />
        <Boton variante="secundario" onClick={agregarPlanta}>+ Agregar planta</Boton>
      </Tarjeta>

      <Tarjeta titulo="Matriz de distancias viales (km)">
        <MatrizEditable filas={config.agroempresas} columnas={config.plantas} unidad="km"
          valores={config.matriz_distancias_km}
          onCambio={(e, p, v) => actualizarConfig((c) => { c.matriz_distancias_km[e][p] = v; return c })} />
      </Tarjeta>

      {problema && (
        <Tarjeta titulo="Costo unitario total calculado (COP/t)">
          <TablaMatriz filas={problema.fuentes} columnas={problema.plantas} matriz={problema.costos}
            formato={moneda} esquina="Empresa" />
        </Tarjeta>
      )}
    </section>
  )
}
