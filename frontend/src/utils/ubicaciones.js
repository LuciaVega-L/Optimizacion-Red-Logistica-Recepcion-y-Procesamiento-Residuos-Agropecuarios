// Coordenadas (cabecera municipal, WGS84) de los municipios del Meta usados en la red.
// El mapa ubica cada agroempresa y planta por su campo `municipio`; si un nodo trae
// `lat` y `lon` propios, se usan esos. Los nodos sin ubicación conocida se listan aparte.
const MUNICIPIOS_META = {
  'acacias': [3.9876, -73.7577],
  'barranca de upia': [4.5672, -72.9653],
  'cabuyaro': [4.2864, -72.792],
  'castilla la nueva': [3.8283, -73.6883],
  'cubarral': [3.7936, -73.8378],
  'cumaral': [4.2703, -73.4866],
  'el calvario': [4.3522, -73.7136],
  'el castillo': [3.5636, -73.7944],
  'el dorado': [3.7397, -73.8358],
  'fuente de oro': [3.4627, -73.6216],
  'granada': [3.5466, -73.7087],
  'guamal': [3.88, -73.7656],
  'la macarena': [2.1828, -73.7847],
  'lejanias': [3.5272, -74.0233],
  'mapiripan': [2.8911, -72.1325],
  'mesetas': [3.3836, -74.0442],
  'puerto concordia': [2.6236, -72.759],
  'puerto gaitan': [4.3133, -72.0825],
  'puerto lleras': [3.2694, -73.3753],
  'puerto lopez': [4.0845, -72.9557],
  'puerto rico': [2.9383, -73.2083],
  'restrepo': [4.2589, -73.5615],
  'san carlos de guaroa': [3.7114, -73.2425],
  'san juan de arama': [3.3733, -73.8761],
  'san juanito': [4.4572, -73.6772],
  'san martin': [3.6963, -73.6987],
  'uribe': [3.2394, -74.3528],
  'villavicencio': [4.142, -73.6266],
  'vista hermosa': [3.125, -73.7514],
}

const clave = (texto) =>
  String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// [lat, lon] del nodo, o null si no se puede ubicar.
export function ubicar(nodo) {
  if (!nodo) return null
  const lat = Number(nodo.lat), lon = Number(nodo.lon)
  if (nodo.lat != null && nodo.lon != null && Number.isFinite(lat) && Number.isFinite(lon)) return [lat, lon]
  return MUNICIPIOS_META[clave(nodo.municipio)] ?? null
}
