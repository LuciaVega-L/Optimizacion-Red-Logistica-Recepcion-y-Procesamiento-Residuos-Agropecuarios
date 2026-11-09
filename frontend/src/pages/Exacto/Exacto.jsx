// HU2 — Ejecución del modelo exacto de transporte.
import { resolverExacto } from '../../api/exacto.js'
import Aviso from '../../components/comunes/Aviso.jsx'
import Boton from '../../components/comunes/Boton.jsx'
import Cargando from '../../components/comunes/Cargando.jsx'
import SinDatos from '../../components/comunes/SinDatos.jsx'
import Tarjeta from '../../components/comunes/Tarjeta.jsx'
import GrafoRed from '../../components/grafo/GrafoRed.jsx'
import TablaMatriz from '../../components/matrices/TablaMatriz.jsx'
import { usePeticion } from '../../hooks/usePeticion.js'
import { useProblema } from '../../hooks/useProblema.js'
import { descargarCSV } from '../../utils/exportar.js'
import { moneda, numero, segundos } from '../../utils/formato.js'

export default function Exacto() {
  const { problema, errores, resultados, guardarResultado } = useProblema()
  const { cargando, error, ejecutar } = usePeticion()
  const res = resultados.exacto

  const resolver = async () => {
    const r = await ejecutar(() => resolverExacto(problema))
    if (r) guardarResultado('exacto', r)
  }

  const exportar = () => descargarCSV('solucion_exacta',
    ['Empresa', ...res.plantas.map((p) => `${p} (t/sem)`), 'Precio sombra u_i'],
    [...res.fuentes.map((f, i) => [f, ...res.asignacion[i], res.precios_sombra_oferta[i]]),
      ['Precio sombra v_j', ...res.precios_sombra_demanda, ''],
      ['Holgura (t/sem)', ...res.holgura_plantas, ''],
      ['Costo total (COP/sem)', res.costo_total]])

  return (
    <section>
      <header className="encabezado">
        <div>
          <h1>Modelo exacto (programación lineal)</h1>
          <p className="texto-suave">Problema de transporte resuelto con PuLP + CBC sobre la forma balanceada.</p>
        </div>
        <div className="acciones">
          <Boton onClick={resolver} disabled={!problema || cargando}>Resolver (Exacto)</Boton>
          {res && <Boton variante="secundario" onClick={exportar}>Exportar CSV</Boton>}
        </div>
      </header>

      {!problema && <SinDatos errores={errores} />}
      {cargando && <Cargando />}
      <Aviso tipo="error" mensajes={error ? [error] : []} />

      {res && (
        <>
          <div className="kpis">
            <Tarjeta titulo="Costo total Z*" valor={moneda(res.costo_total)} detalle="COP por semana" />
            <Tarjeta titulo="Tiempo de ejecución" valor={segundos(res.tiempo_s)} />
            <Tarjeta titulo="Factible" valor={res.factible ? '✔ Sí' : '✘ No'} />
            <Tarjeta titulo="Optimalidad" valor={res.optimalidad_verificada ? '✔ Verificada' : '✘ Revisar'}
              detalle="Costos reducidos ≥ 0 y holgura complementaria" />
          </div>

          {res.nodo_ficticio && (
            <Aviso tipo="info" titulo={`Nodo ficticio ${res.nodo_ficticio.id}`}>
              {res.nodo_ficticio.tipo === 'fuente'
                ? `Agroempresa ficticia con ${numero(res.nodo_ficticio.cantidad)} t/sem y costo 0: representa la capacidad ociosa de las plantas.`
                : `Planta ficticia con ${numero(res.nodo_ficticio.cantidad)} t/sem: residuo que no se puede procesar por falta de capacidad.`}
            </Aviso>
          )}
          {res.rutas_optimo_alternativo.length > 0 && (
            <Aviso tipo="info" titulo="Óptimos alternativos">
              Las rutas {res.rutas_optimo_alternativo.join(', ')} tienen costo reducido 0: existen otras asignaciones con el mismo costo total.
            </Aviso>
          )}

          <div className="columnas">
            <Tarjeta titulo="Matriz de asignación (t/sem)">
              <TablaMatriz filas={res.fuentes} columnas={res.plantas} matriz={res.asignacion}
                resaltar={(v) => v > 1e-6} esquina="Empresa"
                totalesFila={res.asignacion.map((f) => f.reduce((a, b) => a + b, 0))}
                totalesColumna={res.plantas.map((_, j) => res.asignacion.reduce((a, f) => a + f[j], 0))}
                etiquetaTotalColumna="Recibido" etiquetaTotalFila="Enviado" />
            </Tarjeta>
            <Tarjeta titulo="Verificación de restricciones">
              <div className="tabla-contenedor">
                <table className="tabla tabla--compacta tabla--numeros">
                  <thead><tr><th>Restricción</th><th>Lado izq.</th><th /><th>Lado der.</th><th>Cumple</th></tr></thead>
                  <tbody>
                    {res.verificacion.map((f) => (
                      <tr key={f.restriccion}>
                        <th>{f.restriccion}</th><td>{numero(f.lado_izquierdo, 2)}</td><td>{f.operador}</td>
                        <td>{numero(f.lado_derecho, 2)}</td>
                        <td className={f.cumple ? 'texto-ok' : 'texto-error'}>{f.cumple ? '✔' : '✘'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          </div>

          <div className="columnas">
            <Tarjeta titulo="Precios sombra de oferta (u_i)">
              <TablaMatriz filas={res.fuentes} columnas={['u_i (COP/t)']} formato={moneda}
                matriz={res.precios_sombra_oferta.map((u) => [u])} />
            </Tarjeta>
            <Tarjeta titulo="Precios sombra de capacidad (v_j) y holgura">
              <TablaMatriz filas={res.plantas} columnas={['v_j (COP/t)', 'Holgura (t/sem)']}
                formato={(v) => numero(v)}
                matriz={res.plantas.map((_, j) => [res.precios_sombra_demanda[j], res.holgura_plantas[j]])} />
              <p className="texto-suave">v_j &lt; 0: cada tonelada extra de capacidad en la planta j reduce Z* en |v_j|.</p>
            </Tarjeta>
          </div>

          <Tarjeta titulo="Red con los flujos óptimos">
            <GrafoRed fuentes={res.fuentes} plantas={res.plantas} asignacion={res.asignacion}
              ficticio={res.nodo_ficticio} />
          </Tarjeta>
        </>
      )}
    </section>
  )
}
