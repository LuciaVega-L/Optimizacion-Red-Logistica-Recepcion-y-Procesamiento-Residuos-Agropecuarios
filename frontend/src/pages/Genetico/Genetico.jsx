// HU3 — Configuración y ejecución del Algoritmo Genético (la lógica del AG es del Rol 3).
import { useState } from 'react'
import { resolverGenetico } from '../../api/genetico.js'
import Aviso from '../../components/comunes/Aviso.jsx'
import Boton from '../../components/comunes/Boton.jsx'
import Cargando from '../../components/comunes/Cargando.jsx'
import { EsqueletoGrafica, EsqueletoKpis, EsqueletoTabla } from '../../components/comunes/Esqueleto.jsx'
import SinDatos from '../../components/comunes/SinDatos.jsx'
import Tarjeta from '../../components/comunes/Tarjeta.jsx'
import GraficaConvergencia from '../../components/graficas/GraficaConvergencia.jsx'
import TablaMatriz from '../../components/matrices/TablaMatriz.jsx'
import { usePeticion } from '../../hooks/usePeticion.js'
import { useProblema } from '../../hooks/useProblema.js'
import { descargarCSV } from '../../utils/exportar.js'
import { moneda, numero, porcentaje, segundos } from '../../utils/formato.js'

export const PARAMETROS_AG_INICIALES = {
  poblacion: 100, generaciones: 500, tasa_cruce: 0.8, tasa_mutacion: 0.05,
  seleccion: 'torneo', tipo_cruce: 'un_punto', semilla: 1,
}

export function FormularioAG({ valores, onCambio }) {
  const campo = (clave, titulo, props) => (
    <label className="campo">{titulo}
      <input type="number" value={valores[clave] ?? ''} {...props}
        onChange={(e) => onCambio({ ...valores, [clave]: e.target.value === '' ? null : Number(e.target.value) })} />
    </label>
  )
  return (
    <div className="formulario">
      {campo('poblacion', 'Tamaño de población', { min: 2, step: 10 })}
      {campo('generaciones', 'Generaciones', { min: 1, step: 50 })}
      {campo('tasa_cruce', 'Tasa de cruce', { min: 0, max: 1, step: 0.05 })}
      {campo('tasa_mutacion', 'Tasa de mutación', { min: 0, max: 1, step: 0.01 })}
      <label className="campo">Selección
        <select value={valores.seleccion} onChange={(e) => onCambio({ ...valores, seleccion: e.target.value })}>
          <option value="torneo">Torneo</option><option value="ruleta">Ruleta</option>
        </select>
      </label>
      <label className="campo">Cruce
        <select value={valores.tipo_cruce} onChange={(e) => onCambio({ ...valores, tipo_cruce: e.target.value })}>
          <option value="un_punto">Un punto</option><option value="dos_puntos">Dos puntos</option>
        </select>
      </label>
      {campo('semilla', 'Semilla (vacío = aleatoria)', { step: 1 })}
    </div>
  )
}

export default function Genetico() {
  const { problema, errores, resultados, guardarResultado } = useProblema()
  const [parametros, setParametros] = useState(PARAMETROS_AG_INICIALES)
  const { cargando, error, ejecutar } = usePeticion()
  const res = resultados.genetico
  const optimo = resultados.exacto?.costo_total
  const gap = res && optimo ? ((res.costo_total - optimo) / optimo) * 100 : null

  const correr = async () => {
    const r = await ejecutar(() => resolverGenetico(problema, parametros))
    if (r) guardarResultado('genetico', { ...r, parametros })
  }

  return (
    <section>
      <header className="encabezado">
        <div>
          <h1>Algoritmo genético</h1>
          <p className="texto-suave">Cromosoma de proporciones por fila, fitness = 1/(1+Z) penalizado por exceso de capacidad.</p>
        </div>
        <div className="acciones">
          <Boton onClick={correr} disabled={!problema || cargando}>Ejecutar AG</Boton>
          {res && <Boton variante="secundario" onClick={() => descargarCSV('solucion_ag',
            ['Empresa', ...problema.plantas], problema.fuentes.map((f, i) => [f, ...res.asignacion[i]]))}>Exportar CSV</Boton>}
        </div>
      </header>

      {!problema && <SinDatos errores={errores} />}
      <Tarjeta titulo="Parámetros del algoritmo">
        <FormularioAG valores={parametros} onCambio={setParametros} />
      </Tarjeta>
      {cargando && (
        <Cargando texto="Evolucionando la población…">
          <EsqueletoKpis />
          <EsqueletoGrafica />
          <EsqueletoTabla columnas={5} />
        </Cargando>
      )}
      <Aviso tipo="error" mensajes={error ? [error] : []} />

      {res && !cargando && (
        <>
          <div className="kpis">
            <Tarjeta titulo="Mejor costo encontrado" valor={moneda(res.costo_total)} detalle="COP por semana" />
            <Tarjeta titulo="Tiempo de ejecución" valor={segundos(res.tiempo_s)} />
            <Tarjeta titulo="Factible" valor={res.factible ? '✔ Sí' : '✘ No'} />
            <Tarjeta titulo="Gap vs. exacto" valor={gap === null ? 'Resuelve el exacto' : porcentaje(gap)} />
          </div>
          <Tarjeta titulo="Convergencia">
            <GraficaConvergencia historial={res.historial_fitness} optimo={null} etiqueta="Fitness del mejor individuo" />
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
