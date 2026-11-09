// Conversión de la red editable (formato dataConfig.json) al problema de transporte.
// Misma fórmula que backend/app/services/red/repositorio.py:
//   c_ij = distancia_ij * costo_transporte_km_ton + costo_operativo_j   [COP/ton]

export function aProblema(config) {
  const ckm = Number(config.parametros_globales.costo_transporte_km_ton)
  const empresas = config.agroempresas
  const plantas = config.plantas
  const d = config.matriz_distancias_km
  const distancias = empresas.map((e) => plantas.map((p) => Number(d[e.id]?.[p.id])))
  return {
    fuentes: empresas.map((e) => e.id),
    plantas: plantas.map((p) => p.id),
    oferta: empresas.map((e) => Number(e.oferta_ton_sem)),
    demanda: plantas.map((p) => Number(p.capacidad_maxima_ton_sem)),
    costos: distancias.map((fila) => fila.map((km, j) => km * ckm + Number(plantas[j].costo_operativo_ton))),
    distancias,
    costo_km_ton: ckm,
    costo_operativo: plantas.map((p) => Number(p.costo_operativo_ton)),
  }
}

const vacio = (v) => v === '' || v === null || v === undefined || Number.isNaN(Number(v))

// Validación inmediata en el navegador (el backend vuelve a validar al resolver).
export function validarConfig(config) {
  const errores = []
  const ckm = config.parametros_globales.costo_transporte_km_ton
  if (vacio(ckm) || Number(ckm) < 0) errores.push('El costo por km·ton debe ser un número no negativo.')
  const revisarIds = (lista, tipo) => {
    if (!lista.length) errores.push(`Debe haber al menos una ${tipo}.`)
    const ids = lista.map((x) => String(x.id).trim())
    if (ids.some((x) => !x)) errores.push(`Hay ${tipo}s sin identificador.`)
    const rep = [...new Set(ids.filter((x, k) => x && ids.indexOf(x) !== k))]
    if (rep.length) errores.push(`Identificadores de ${tipo} repetidos: ${rep.join(', ')}.`)
  }
  revisarIds(config.agroempresas, 'agroempresa')
  revisarIds(config.plantas, 'planta')
  config.agroempresas.forEach((e) => {
    if (vacio(e.oferta_ton_sem)) errores.push(`La oferta de ${e.id} está vacía.`)
    else if (Number(e.oferta_ton_sem) < 0) errores.push(`La oferta de ${e.id} no puede ser negativa.`)
    config.plantas.forEach((p) => {
      const km = config.matriz_distancias_km[e.id]?.[p.id]
      if (vacio(km)) errores.push(`Falta la distancia ${e.id}→${p.id}.`)
      else if (Number(km) < 0) errores.push(`La distancia ${e.id}→${p.id} no puede ser negativa.`)
    })
  })
  config.plantas.forEach((p) => {
    if (vacio(p.capacidad_maxima_ton_sem)) errores.push(`La capacidad de ${p.id} está vacía.`)
    else if (Number(p.capacidad_maxima_ton_sem) < 0) errores.push(`La capacidad de ${p.id} no puede ser negativa.`)
    if (vacio(p.costo_operativo_ton)) errores.push(`El costo operativo de ${p.id} está vacío.`)
    else if (Number(p.costo_operativo_ton) < 0) errores.push(`El costo operativo de ${p.id} no puede ser negativo.`)
  })
  return errores
}

export function balance(config) {
  const oferta = config.agroempresas.reduce((s, e) => s + Number(e.oferta_ton_sem || 0), 0)
  const capacidad = config.plantas.reduce((s, p) => s + Number(p.capacidad_maxima_ton_sem || 0), 0)
  const dif = capacidad - oferta
  if (Math.abs(dif) < 1e-6) return { estado: 'balanceado', oferta, capacidad, texto: 'Red balanceada (oferta = capacidad).' }
  if (dif > 0) return { estado: 'oferta_menor', oferta, capacidad, texto: `Desbalanceada: sobran ${dif} t/sem de capacidad → se agrega una agroempresa ficticia.` }
  return { estado: 'oferta_mayor', oferta, capacidad, texto: `Desbalanceada: faltan ${-dif} t/sem de capacidad → se agrega una planta ficticia (residuo sin procesar).` }
}

// Siguiente id libre: E10 -> E11, P4 -> P5
export function siguienteId(lista, prefijo, ancho) {
  const nums = lista.map((x) => Number(String(x.id).replace(/^\D+/, ''))).filter(Number.isFinite)
  let k = (nums.length ? Math.max(...nums) : 0) + 1
  const ids = new Set(lista.map((x) => x.id))
  let id
  do { id = `${prefijo}${String(k++).padStart(ancho, '0')}` } while (ids.has(id))
  return id
}
