// La red sobre un mapa real del Meta (Leaflet + teselas de OpenStreetMap, sin llave de API).
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useRed } from '../../context/RedContext.jsx'
import { numero } from '../../utils/formato.js'
import { rutaCerrada } from '../../utils/red.js'
import { ubicar } from '../../utils/ubicaciones.js'

const COLOR_FUENTE = '#15803d'
const COLOR_PLANTA = '#1d4ed8'
const COLOR_FLUJO = '#1e3a8a'
const COLOR_RUTA = '#334155'

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

// Nodos en el mismo municipio (p. ej. E09 y P2 en Restrepo) se separan unos km en círculo.
function separarCoincidentes(puntos) {
  const grupos = new Map()
  puntos.forEach((p) => {
    const k = p.pos.join(',')
    grupos.set(k, [...(grupos.get(k) ?? []), p])
  })
  grupos.forEach((grupo) => {
    if (grupo.length < 2) return
    grupo.forEach((p, k) => {
      const a = (2 * Math.PI * k) / grupo.length - Math.PI / 2
      p.pos = [p.pos[0] + 0.06 * Math.sin(a), p.pos[1] + 0.06 * Math.cos(a)]
    })
  })
}

export default function MapaRed({ fuentes, plantas, asignacion, ficticio, alto = 460 }) {
  const ref = useRef(null)
  const { config } = useRed()

  const porId = (lista, id) => lista?.find((x) => x.id === id) ?? { id }
  const nodosF = fuentes.map((id) => ({ id, tipo: 'fuente', datos: porId(config?.agroempresas, id) }))
  const nodosP = plantas.map((id) => ({ id, tipo: 'planta', datos: porId(config?.plantas, id) }))
  const sinUbicar = [...nodosF, ...nodosP].filter((n) => !ubicar(n.datos)).map((n) => n.id)

  useEffect(() => {
    if (!ref.current) return undefined
    const mapa = L.map(ref.current, { zoomSnap: 0.25, scrollWheelZoom: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa)

    const puntos = [...nodosF, ...nodosP]
      .map((n) => ({ ...n, pos: ubicar(n.datos) }))
      .filter((n) => n.pos)
    separarCoincidentes(puntos)
    const pos = Object.fromEntries(puntos.map((p) => [`${p.tipo}:${p.id}`, p.pos]))

    // Rutas primero para que queden debajo de los nodos
    const maximo = asignacion ? Math.max(1, ...asignacion.flat()) : 1
    fuentes.forEach((f, i) => plantas.forEach((p, j) => {
      const a = pos[`fuente:${f}`], b = pos[`planta:${p}`]
      if (!a || !b) return
      const x = asignacion?.[i]?.[j] ?? 0
      if (asignacion && x <= 1e-6) return
      if (!asignacion && config && rutaCerrada(config, f, p)) return   // ruta deshabilitada
      const km = config?.matriz_distancias_km?.[f]?.[p]
      const linea = L.polyline([a, b], asignacion
        ? { color: COLOR_FLUJO, weight: 2 + 8 * (x / maximo), opacity: 0.9 }
        : { color: COLOR_RUTA, weight: 1.5, opacity: 0.85, dashArray: '4 4' }).addTo(mapa)
      linea.bindTooltip(`<strong>${esc(f)} → ${esc(p)}</strong>`
        + (asignacion ? `<br>${numero(x, 1)} t/sem` : '')
        + (km != null && km !== '' ? `<br>${numero(Number(km))} km (matriz)` : ''), { sticky: true })
    }))

    const ofertas = nodosF.map((n) => Number(n.datos.oferta_ton_sem) || 0)
    const maxOferta = Math.max(1, ...ofertas)
    puntos.forEach((n) => {
      const d = n.datos
      const lugar = d.municipio ? `<br>${esc(d.municipio)}` : ''
      if (n.tipo === 'fuente') {
        const oferta = Number(d.oferta_ton_sem) || 0
        L.circleMarker(n.pos, {
          radius: 6 + 8 * Math.sqrt(oferta / maxOferta), color: '#ffffff', weight: 2,
          fillColor: COLOR_FUENTE, fillOpacity: 0.9,
        }).addTo(mapa)
          .bindTooltip(esc(n.id), { permanent: true, direction: 'top', offset: [0, -8], className: 'mapa-etiqueta' })
          .bindPopup(`<strong>${esc(d.nombre ?? n.id)}</strong>${lugar}<br>Oferta: ${numero(oferta)} t/sem`
            + (d.sector ? `<br>Sector: ${esc(d.sector)}` : ''))
      } else {
        L.marker(n.pos, {
          icon: L.divIcon({ className: '', html: `<div class="mapa-planta">${esc(n.id)}</div>`, iconSize: [34, 24], iconAnchor: [17, 12] }),
          zIndexOffset: 1000, keyboard: true, title: d.nombre ?? n.id,
        }).addTo(mapa)
          .bindPopup(`<strong>${esc(d.nombre ?? n.id)}</strong>${lugar}`
            + `<br>Capacidad: ${numero(Number(d.capacidad_maxima_ton_sem) || 0)} t/sem`
            + (d.costo_operativo_ton != null ? `<br>Costo operativo: ${numero(Number(d.costo_operativo_ton))} COP/t` : ''))
      }
    })

    if (puntos.length) mapa.fitBounds(L.latLngBounds(puntos.map((p) => p.pos)), { padding: [30, 30] })
    else mapa.setView([4.0, -73.3], 8)
    return () => mapa.remove()
  }, [fuentes, plantas, asignacion, config])  // eslint-disable-line react-hooks/exhaustive-deps

  const ociosas = ficticio?.flujos?.reduce((s, x) => s + (x > 1e-6 ? x : 0), 0) ?? 0
  const descripcion = asignacion
    ? `Mapa de flujos: ${fuentes.length} agroempresas envían residuos a ${plantas.length} plantas. El detalle está en la tabla de asignación.`
    : `Mapa de la red: ${fuentes.length} agroempresas y ${plantas.length} plantas ubicadas en el departamento del Meta.`

  return (
    <div>
      <div ref={ref} className="mapa" style={{ height: alto }} role="region" aria-label={descripcion} />
      <p className="mapa__leyenda texto-suave">
        <span className="mapa__punto mapa__punto--fuente" /> Agroempresa (tamaño según oferta)
        <span className="mapa__punto mapa__punto--planta" /> Planta
        <span>{asignacion ? 'Grosor de la línea según toneladas enviadas.' : 'Líneas: rutas posibles (en línea recta).'}</span>
      </p>
      {ficticio && ociosas > 0 && (
        <p className="texto-suave">
          {ficticio.tipo === 'fuente'
            ? `La agroempresa ficticia ${ficticio.id} no aparece en el mapa: representa ${numero(ociosas, 1)} t/sem de capacidad ociosa.`
            : `La planta ficticia ${ficticio.id} no aparece en el mapa: representa ${numero(ociosas, 1)} t/sem sin procesar.`}
        </p>
      )}
      {sinUbicar.length > 0 && (
        <p className="texto-alerta">
          Sin ubicación conocida: {sinUbicar.join(', ')}. Escribe su municipio del Meta en Parametrización para verlos en el mapa.
        </p>
      )}
    </div>
  )
}
