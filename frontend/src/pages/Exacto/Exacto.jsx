// HU2 — Ejecución del modelo exacto de transporte.
import { resolverExacto } from '../../api/exacto.js'
import Aviso from '../../components/comunes/Aviso.jsx'
import Boton from '../../components/comunes/Boton.jsx'
import Cargando from '../../components/comunes/Cargando.jsx'
import EncabezadoPagina from '../../components/comunes/EncabezadoPagina.jsx'
import { EsqueletoGrafica, EsqueletoKpis, EsqueletoTabla } from '../../components/comunes/Esqueleto.jsx'
import EstadoVacio from '../../components/comunes/EstadoVacio.jsx'
import Icono from '../../components/comunes/Icono.jsx'
import Plegable from '../../components/comunes/Plegable.jsx'
import SinDatos from '../../components/comunes/SinDatos.jsx'
import Tarjeta from '../../components/comunes/Tarjeta.jsx'
import VistaRed from '../../components/grafo/VistaRed.jsx'
import TablaMatriz from '../../components/matrices/TablaMatriz.jsx'
import { useNotificaciones } from '../../context/NotificacionesContext.jsx'
import { usePeticion } from '../../hooks/usePeticion.js'
import { useProblema } from '../../hooks/useProblema.js'
import { descargarCSV } from '../../utils/exportar.js'
import { moneda, numero, segundos } from '../../utils/formato.js'

export default function Exacto() {
  const { problema, errores, resultados, guardarResultado } = useProblema()
  const { cargando, error, ejecutar } = usePeticion()
  const { notificar } = useNotificaciones()
  const res = resultados.exacto

  const resolver = async () => {
    const r = await ejecutar(() => resolverExacto(problema))
    if (r) {
      guardarResultado('exacto', r)
      notificar(`Solución óptima encontrada: ${moneda(r.costo_total)} por semana`)
    }
  }

  const exportar = () => {
    descargarCSV('solucion_exacta',
      ['Empresa', ...res.plantas.map((p) => `${p} (t/sem)`), 'Precio sombra u_i'],
      [...res.fuentes.map((f, i) => [f, ...res.asignacion[i], res.precios_sombra_oferta[i]]),
        ['Precio sombra v_j', ...res.precios_sombra_demanda, ''],
        ['Holgura (t/sem)', ...res.holgura_plantas, ''],
        ['Costo total (COP/sem)', res.costo_total]])
    notificar('CSV de la solución descargado')
  }

  const incumplidas = res?.verificacion.filter((f) => !f.cumple).length ?? 0

  return (
    <section>
      <EncabezadoPagina titulo="Modelo exacto" descripcion="Costo mínimo de transporte con programación lineal.">
        <Boton onClick={resolver} disabled={!problema} cargando={cargando}>
          {!cargando && <Icono nombre="jugar" tamano={16} />}{res ? 'Resolver de nuevo' : 'Resolver'}
        </Boton>
        {res && <Boton variante="secundario" onClick={exportar}><Icono nombre="descargar" tamano={16} />CSV</Boton>}
      </EncabezadoPagina>

      {!problema && <SinDatos errores={errores} />}
      {cargando && (
        <Cargando texto="Resolviendo el modelo exacto…">
          <EsqueletoKpis />
          <div className="columnas"><EsqueletoTabla columnas={5} /><EsqueletoGrafica /></div>
        </Cargando>
      )}
      {error && !cargando && <Aviso tipo="error" titulo="No se pudo resolver el modelo" mensajes={[error]} onReintentar={resolver} />}
      {problema && !res && !cargando && !error && (
        <EstadoVacio titulo="Aún no hay solución" icono="jugar"
          descripcion="Pulsa «Resolver» para ver la asignación óptima, los precios sombra y el grafo de flujos." />
      )}

      {res && !cargando && (
        <>
          <div className="kpis">
            <Tarjeta destacada titulo="Costo total Z*" valor={moneda(res.costo_total)} detalle="COP por semana" />
            <Tarjeta titulo="Factible" valor={res.factible ? 'Sí' : 'No'} tono={res.factible ? 'ok' : 'error'} />
            <Tarjeta titulo="Optimalidad" valor={res.optimalidad_verificada ? 'Verificada' : 'Revisar'}
              tono={res.optimalidad_verificada ? 'ok' : 'error'} />
            <Tarjeta titulo="Tiempo" valor={segundos(res.tiempo_s)} />
          </div>

          {res.nodo_ficticio && (
            <Aviso tipo="info" titulo={`Nodo ficticio ${res.nodo_ficticio.id}`}>
              {res.nodo_ficticio.tipo === 'fuente'
                ? `${numero(res.nodo_ficticio.cantidad)} t/sem de capacidad ociosa en las plantas.`
                : `${numero(res.nodo_ficticio.cantidad)} t/sem de residuo sin procesar por falta de capacidad.`}
            </Aviso>
          )}
          {res.rutas_optimo_alternativo.length > 0 && (
            <Aviso tipo="info" titulo="Hay óptimos alternativos">
              Las rutas {res.rutas_optimo_alternativo.join(', ')} permiten otra asignación con el mismo costo.
            </Aviso>
          )}

          <div className="columnas">
            <Tarjeta titulo="Asignación óptima (t/sem)">
              <TablaMatriz filas={res.fuentes} columnas={res.plantas} matriz={res.asignacion}
                resaltar={(v) => v > 1e-6} esquina="Empresa"
                totalesFila={res.asignacion.map((f) => f.reduce((a, b) => a + b, 0))}
                totalesColumna={res.plantas.map((_, j) => res.asignacion.reduce((a, f) => a + f[j], 0))}
                etiquetaTotalColumna="Recibido" etiquetaTotalFila="Enviado" />
            </Tarjeta>
            <VistaRed titulo="Flujos en la red" fuentes={res.fuentes} plantas={res.plantas}
              asignacion={res.asignacion} ficticio={res.nodo_ficticio} />
          </div>

          <Plegable titulo="Precios sombra y holguras">
            <div className="columnas">
              <div>
                <h3 className="subtitulo">Oferta (u<sub>i</sub>, COP/t)</h3>
                <TablaMatriz filas={res.fuentes} columnas={['u_i']} formato={moneda}
                  matriz={res.precios_sombra_oferta.map((u) => [u])} />
              </div>
              <div>
                <h3 className="subtitulo">Capacidad (v<sub>j</sub>, COP/t) y holgura</h3>
                <TablaMatriz filas={res.plantas} columnas={['v_j', 'Holgura (t/sem)']} formato={(v) => numero(v)}
                  matriz={res.plantas.map((_, j) => [res.precios_sombra_demanda[j], res.holgura_plantas[j]])} />
                <p className="texto-suave">Si v<sub>j</sub> &lt; 0, cada tonelada extra de capacidad reduce Z* en |v<sub>j</sub>|.</p>
              </div>
            </div>
          </Plegable>

          <Plegable titulo={`Verificación de restricciones · ${incumplidas ? `${incumplidas} sin cumplir` : 'todas se cumplen'}`}>
            <div className="tabla-contenedor">
              <table className="tabla tabla--compacta tabla--numeros">
                <thead><tr><th>Restricción</th><th>Lado izq.</th><th><span className="sr-only">Operador</span></th><th>Lado der.</th><th>Cumple</th></tr></thead>
                <tbody>
                  {res.verificacion.map((f) => (
                    <tr key={f.restriccion}>
                      <th>{f.restriccion}</th><td>{numero(f.lado_izquierdo, 2)}</td><td>{f.operador}</td>
                      <td>{numero(f.lado_derecho, 2)}</td>
                      <td className={f.cumple ? 'texto-ok' : 'texto-error'}>{f.cumple ? 'Sí' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Plegable>
        </>
      )}
    </section>
  )
}
