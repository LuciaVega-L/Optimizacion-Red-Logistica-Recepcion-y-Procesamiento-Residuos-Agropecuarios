// Grafo dirigido G = (V, E) de la red con vis-network.
import { useEffect, useRef } from 'react'
import { Network } from 'vis-network/standalone'
import { useRed } from '../../context/RedContext.jsx'
import { numero } from '../../utils/formato.js'
import { rutaCerrada } from '../../utils/red.js'

export default function GrafoRed({ fuentes, plantas, asignacion, ficticio, alto = 460 }) {
  const ref = useRef(null)
  const { config } = useRed()

  useEffect(() => {
    if (!ref.current) return undefined
    const sep = 60
    const nodos = [
      ...fuentes.map((f, i) => ({ id: `f:${f}`, label: f, x: -420, y: i * sep, color: { background: '#dbeafe', border: '#2563eb' }, shape: 'box' })),
      ...plantas.map((p, j) => ({ id: `p:${p}`, label: p, x: 420,
        y: (j + 0.5) * (fuentes.length * sep) / plantas.length - sep / 2, color: { background: '#1d4ed8', border: '#1e3a8a' }, font: { color: '#ffffff' }, shape: 'ellipse' })),
    ]
    const arcos = []
    const maximo = asignacion ? Math.max(1, ...asignacion.flat()) : 1
    fuentes.forEach((f, i) => plantas.forEach((p, j) => {
      const x = asignacion?.[i]?.[j] ?? 0
      if (asignacion && x <= 1e-6) return
      if (!asignacion && config && rutaCerrada(config, f, p)) return   // ruta deshabilitada
      arcos.push({ from: `f:${f}`, to: `p:${p}`, arrows: 'to',
        width: asignacion ? 1 + 7 * (x / maximo) : 0.5,
        label: asignacion ? `${numero(x, 1)} t` : undefined,
        color: { color: asignacion ? '#1e3a8a' : '#64748b' }, font: { size: 11, align: 'middle' } })
    }))
    if (ficticio?.tipo === 'fuente') {
      nodos.push({ id: `f:${ficticio.id}`, label: `${ficticio.id} (ficticia)`, x: -420, y: fuentes.length * sep,
        color: { background: '#f1f5f9', border: '#94a3b8' }, shape: 'box', shapeProperties: { borderDashes: true } })
      ficticio.flujos.forEach((x, j) => x > 1e-6 && arcos.push({ from: `f:${ficticio.id}`, to: `p:${plantas[j]}`,
        arrows: 'to', dashes: true, label: `${numero(x, 1)} t ociosas`, color: { color: '#475569' } }))
    }
    const red = new Network(ref.current, { nodes: nodos, edges: arcos }, {
      physics: false, nodes: { font: { size: 15, face: 'Inter, system-ui, sans-serif' }, margin: 8, borderWidth: 1.5 }, interaction: { dragNodes: true, zoomView: true },
      edges: { smooth: { type: 'curvedCW', roundness: 0.05 } },
    })
    red.fit()
    return () => red.destroy()
  }, [fuentes, plantas, asignacion, ficticio, config])

  const descripcion = asignacion
    ? `Grafo de flujos: ${fuentes.length} agroempresas envían residuos a ${plantas.length} plantas. El detalle está en la tabla de asignación.`
    : `Grafo de la red: ${fuentes.length} agroempresas conectadas con ${plantas.length} plantas.`
  return <div ref={ref} className="grafo" style={{ height: alto }} role="img" aria-label={descripcion} />
}
