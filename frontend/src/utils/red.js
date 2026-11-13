// Conversión de la red editable (formato dataConfig.json) al problema de transporte.
// Misma fórmula que backend/app/services/red/repositorio.py:
//   c_ij = distancia_ij * costo_transporte_km_ton + costo_operativo_j   [COP/ton]
const vacio = (v) => v === '' || v === null || v === undefined || Number.isNaN(Number(v))

export function normalizarConfig(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (raw.parametros_globales && Array.isArray(raw.agroempresas) && Array.isArray(raw.plantas)) return raw

  const p = raw.parametros_entrada
  if (!p || !p.fuentes || !p.plantas) return null

  return {
    id: raw.id,
    nombre: raw.nombre,
    descripcion: raw.descripcion,
    parametros_globales: {
      costo_transporte_km_ton: p.costo_transporte_km_ton ?? raw.costo_transporte_km_ton ?? 1200,
    },
    agroempresas: p.fuentes.map((id, i) => ({ id, nombre: id, oferta_ton_sem: p.oferta[i] })),
    plantas: p.plantas.map((id, j) => ({
      id, nombre: id,
      capacidad_maxima_ton_sem: p.demanda[j],
      costo_operativo_ton: p.costo_operativo[j],
    })),
    matriz_distancias_km: Object.fromEntries(
      p.fuentes.map((f, i) => [f, Object.fromEntries(p.plantas.map((pl, j) => [pl, p.distancias_km[i][j]]))])
    ),
    rutas_deshabilitadas: p.rutas_deshabilitadas ?? [],
  }
}

// Rutas cerradas: pares [agroempresa, planta], mismo formato que dataConfig.json y la BD.
export const rutaCerrada = (config, e, p) =>
  (config.rutas_deshabilitadas ?? []).some(([f, q]) => f === e && q === p)

export function alternarRuta(config, e, p) {
  const lista = config.rutas_deshabilitadas ?? []
  config.rutas_deshabilitadas = rutaCerrada(config, e, p)
    ? lista.filter(([f, q]) => !(f === e && q === p))
    : [...lista, [e, p]]
  return config
}

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
    // Solo las rutas cuyos dos extremos siguen existiendo
    rutas_deshabilitadas: (config.rutas_deshabilitadas ?? []).filter(([f, q]) =>
      empresas.some((e) => e.id === f) && plantas.some((p) => p.id === q)),
    // λ del AG (dataConfig: factorPlanta = oferta, factorDemanda = capacidad); vacío = valor por defecto
    penalizacion_oferta: vacio(config.penalizaciones?.factorPlanta) ? null : Number(config.penalizaciones.factorPlanta),
    penalizacion_capacidad: vacio(config.penalizaciones?.factorDemanda) ? null : Number(config.penalizaciones.factorDemanda),
  }
}

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
  config.agroempresas.forEach((e) => {
    if (Number(e.oferta_ton_sem) > 0 && config.plantas.length && config.plantas.every((p) => rutaCerrada(config, e.id, p.id)))
      errores.push(`${e.id} tiene todas sus rutas cerradas: su residuo no puede llegar a ninguna planta.`)
  })
  ;[['factorPlanta', 'oferta'], ['factorDemanda', 'capacidad']].forEach(([clave, nombre]) => {
    const v = config.penalizaciones?.[clave]
    if (v !== undefined && v !== null && v !== '' && (Number.isNaN(Number(v)) || Number(v) < 0))
      errores.push(`La penalización de ${nombre} del AG debe ser un número no negativo.`)
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
