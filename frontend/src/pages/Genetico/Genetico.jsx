// HU3 — Configuración y ejecución del Algoritmo Genético (la lógica del AG es del Rol 3).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { resolverGenetico } from '../../api/genetico.js'
import Aviso from '../../components/comunes/Aviso.jsx'
import Boton from '../../components/comunes/Boton.jsx'
import Cargando from '../../components/comunes/Cargando.jsx'
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina.jsx'
import { EsqueletoGrafica, EsqueletoKpis, EsqueletoTabla } from '../../components/comunes/Esqueleto.jsx'
import EstadoVacio from '../../components/comunes/EstadoVacio.jsx'
import Icono from '../../components/comunes/Icono.jsx'
import SinDatos from '../../components/comunes/SinDatos.jsx'
import Tarjeta from '../../components/comunes/Tarjeta.jsx'
import GuardarResultado from '../../components/historial/GuardarResultado.jsx'
import GraficaConvergencia from '../../components/graficas/GraficaConvergencia.jsx'
import TablaMatriz from '../../components/matrices/TablaMatriz.jsx'
import { useNotificaciones } from '../../context/NotificacionesContext.jsx'
import { usePeticion } from '../../hooks/usePeticion.js'
import { useProblema } from '../../hooks/useProblema.js'
import { descargarCSV } from '../../utils/exportar.js'
import { moneda, numero, porcentaje, segundos } from '../../utils/formato.js'

export const PARAMETROS_AG_INICIALES = {
  poblacion: 100, generaciones: 500, tasa_cruce: 0.8, tasa_mutacion: 0.05,
  seleccion: 'torneo', tipo_cruce: 'un_punto', semilla: 1,
}

export function FormularioAG({ valores, onCambio, deshabilitado = false }) {
  const campo = (clave, titulo, props) => (
    <label className="campo">{titulo}
      <input type="number" value={valores[clave] ?? ''} disabled={deshabilitado} {...props}
        onChange={(e) => onCambio({ ...valores, [clave]: e.target.value === '' ? null : Number(e.target.value) })} />
    </label>
  )
  return (
    <div className="formulario">
      {campo('poblacion', 'Población', { min: 2, step: 10 })}
      {campo('generaciones', 'Generaciones', { min: 1, step: 50 })}
      {campo('tasa_cruce', 'Tasa de cruce', { min: 0, max: 1, step: 0.05 })}
      {campo('tasa_mutacion', 'Tasa de mutación', { min: 0, max: 1, step: 0.01 })}
      <label className="campo">Selección
        <select value={valores.seleccion} disabled={deshabilitado}
          onChange={(e) => onCambio({ ...valores, seleccion: e.target.value })}>
          <option value="torneo">Torneo</option><option value="ruleta">Ruleta</option>
        </select>
      </label>
      <label className="campo">Cruce
        <select value={valores.tipo_cruce} disabled={deshabilitado}
          onChange={(e) => onCambio({ ...valores, tipo_cruce: e.target.value })}>
          <option value="un_punto">Un punto</option><option value="dos_puntos">Dos puntos</option>
        </select>
      </label>
      {campo('semilla', 'Semilla', { step: 1, placeholder: 'Aleatoria' })}
    </div>
  )
}

const curvaDeConvergencia = (res) => res?.historial_fitness ?? []

export default function Genetico() {
  const { problema, errores, resultados, guardarResultado } = useProblema()
  const [parametros, setParametros] = useState(PARAMETROS_AG_INICIALES)
  const { cargando, error, ejecutar } = usePeticion()
  const { notificar } = useNotificaciones()
  const res = resultados.genetico
  const optimo = resultados.exacto?.costo_total
  const gap = res && optimo ? ((res.costo_total - optimo) / optimo) * 100 : null
  const curva = curvaDeConvergencia(res)

  const correr = async () => {
    const r = await ejecutar(() => resolverGenetico(problema, parametros))
    if (!r) return

    guardarResultado('genetico', { ...r, parametros })
    notificar(`AG terminado: mejor costo ${moneda(r.costo_total)}`)
  }

  const exportar = () => {
    descargarCSV('solucion_ag', ['Empresa', ...problema.plantas], problema.fuentes.map((f, i) => [f, ...res.asignacion[i]]))
    notificar('CSV del AG descargado')
  }

  return (
    <section>
      <EncabezadoPagina titulo="Algoritmo genético" descripcion="Busca una solución cercana al óptimo con una población que evoluciona.">
        <Boton onClick={correr} disabled={!problema} cargando={cargando}>
          {!cargando && <Icono nombre="jugar" tamano={16} />}Ejecutar AG
        </Boton>
        {res && <Boton variante="secundario" onClick={exportar}><Icono nombre="descargar" tamano={16} />CSV</Boton>}
      </EncabezadoPagina>

      {!problema && <SinDatos errores={errores} />}
      <Tarjeta titulo="Parámetros">
        <FormularioAG valores={parametros} onCambio={setParametros} deshabilitado={cargando} />
      </Tarjeta>

      {cargando && (
        <Cargando texto="Evolucionando la población…">
          <EsqueletoKpis />
          <EsqueletoGrafica />
          <EsqueletoTabla columnas={5} />
        </Cargando>
      )}
      {error && !cargando && <Aviso tipo="error" titulo="El algoritmo genético falló" mensajes={[error]} onReintentar={correr} />}
      {problema && !res && !cargando && !error && (
        <EstadoVacio titulo="Aún no hay ejecución" icono="jugar"
          descripcion="Ajusta los parámetros y pulsa «Ejecutar AG» para ver la convergencia y la mejor asignación." />
      )}

      {res && !cargando && (
        <>
          <div className="kpis">
            <Tarjeta destacada titulo="Mejor costo" valor={moneda(res.costo_total)} detalle="COP por semana" />
            <Tarjeta titulo="Gap vs. exacto" valor={gap === null ? '—' : porcentaje(gap)}
              detalle={gap === null ? <Link to="/exacto">Resuelve el exacto para calcularlo</Link> : undefined} />
            <Tarjeta titulo="Factible" valor={res.factible ? 'Sí' : 'No'} tono={res.factible ? 'ok' : 'error'} />
            <Tarjeta titulo="Tiempo" valor={segundos(res.tiempo_s)} />
          </div>
          <GuardarResultado solucion={res} extra={{ parametros_algoritmo: res.parametros ?? parametros }} />
          <Tarjeta titulo="Convergencia">
            {curva.length > 0
              ? <GraficaConvergencia historial={curva} optimo={optimo ?? null}
                  etiqueta="Mejor costo Z por generación (COP/sem)" />
              : <Aviso tipo="error" titulo="Sin historial de convergencia"
                  mensajes={['La respuesta del AG no incluyó la curva de convergencia.']} />}
          </Tarjeta>
          <Tarjeta titulo="Mejor asignación (t/sem)">
            <TablaMatriz filas={problema.fuentes} columnas={problema.plantas} matriz={res.asignacion}
              formato={(v) => numero(v, 1)} resaltar={(v) => v > 1e-6} esquina="Empresa" />
          </Tarjeta>
        </>
      )}
    </section>
  )
}
