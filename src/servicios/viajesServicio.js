import { empresasTransporte } from '../datos/empresas'
import { tiposServicio } from '../datos/servicios'
import { generarPasajesDemo } from '../datos/pasajes'

// Todas las funciones de este archivo simulan un backend real. Los
// resultados se generan en el navegador a partir de datos estáticos y
// nunca se realiza ninguna petición de red.

const CLAVE_PASAJES = 'rutalibre:pasajes:'

// Única llamada de red real de este archivo: consulta al backend de
// Spring Boot (ver backend/src/.../viajes) el listado de viajes cuyo
// tipo de servicio (tipo_bus.nombre_tipo) coincide con el valor recibido.
// El resto de este servicio (buscarViajes, comprarPasaje, etc.) sigue
// siendo una simulación en el navegador: el filtro por origen/destino/
// fecha no forma parte de este cambio.
const URL_BASE_API = 'http://localhost:8080'

function retrasoSimulado(ms = 620) {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

/**
 * Consulta al backend real los viajes, opcionalmente filtrados por uno o
 * varios tipos de servicio (`Semi Cama`, `Prime`, `Económico`, `Ultra`,
 * `Bus Cama`, u otro que exista en la BD).
 *
 * GET /api/viajes/tipo-servicio                                   → todos
 * GET /api/viajes/tipo-servicio?tipoServicio=Semi%20Cama            → uno
 * GET /api/viajes/tipo-servicio?tipoServicio=Semi%20Cama&tipoServicio=Prime → varios (OR)
 *
 * La respuesta ya viene en la misma forma que `ResultadoViaje` (ver
 * `src/tipos/index.js`), lista para pasarse directo a
 * `TarjetaResultadoViaje` sin transformarla.
 * @param {string[]} [tiposServicio] Lista vacía o no enviada = "Todos".
 * @returns {Promise<Array<import('../tipos').ResultadoViaje>>}
 */
export async function obtenerViajesReales(tiposServicio = []) {
  const parametros = new URLSearchParams()
  tiposServicio.forEach((tipo) => parametros.append('tipoServicio', tipo))
  const query = parametros.toString()
  const url = `${URL_BASE_API}/api/viajes/tipo-servicio${query ? `?${query}` : ''}`

  let respuesta
  try {
    respuesta = await fetch(url)
  } catch (error) {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté disponible.')
  }

  if (!respuesta.ok) {
    throw new Error(`El servidor respondió con un error (${respuesta.status}) al consultar los viajes.`)
  }

  return respuesta.json()
}

/**
 * Consulta al backend los tipos de bus existentes en la BD (id +
 * nombre_tipo), usados para construir dinámicamente los chips de
 * filtro "Tipo de servicio". Nunca están hardcodeados en el frontend.
 *
 * GET /api/viajes/tipos-bus
 * @returns {Promise<Array<{idTipoBus: number, nombreTipo: string}>>}
 */
export async function obtenerTiposDeBus() {
  let respuesta
  try {
    respuesta = await fetch(`${URL_BASE_API}/api/viajes/tipos-bus`)
  } catch (error) {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté disponible.')
  }

  if (!respuesta.ok) {
    throw new Error(`El servidor respondió con un error (${respuesta.status}) al obtener los tipos de bus.`)
  }

  return respuesta.json()
}

const serviciosPorTipo = {
  Económico: ['WiFi', 'Baño'],
  'Semi Cama': ['WiFi', 'Baño', 'TV'],
  'Bus Cama': ['WiFi', 'Baño', 'TV', 'Snack'],
  Prime: ['WiFi', 'Baño', 'TV', 'Snack', 'USB'],
  Ultra: ['WiFi', 'Baño', 'TV', 'Snack', 'USB', 'Cabina privada'],
}

function generarHoraAleatoria() {
  const hora = Math.floor(Math.random() * 24)
  const minuto = Math.random() > 0.5 ? '00' : '30'
  return `${String(hora).padStart(2, '0')}:${minuto}`
}

function sumarHoras(horaInicial, horas) {
  const [h, m] = horaInicial.split(':').map(Number)
  const totalMinutos = h * 60 + m + horas * 60
  const horaFinal = Math.floor(totalMinutos / 60) % 24
  const minutoFinal = totalMinutos % 60
  return `${String(horaFinal).padStart(2, '0')}:${String(minutoFinal).padStart(2, '0')}`
}

/**
 * Simula la búsqueda de pasajes disponibles entre dos ciudades.
 * @returns {Promise<import('../tipos').ResultadoViaje[]>}
 */
export async function buscarViajes({ origen, destino }) {
  await retrasoSimulado()

  const cantidad = 4 + Math.floor(Math.random() * 3)
  const resultados = []

  for (let i = 0; i < cantidad; i += 1) {
    const empresa = empresasTransporte[i % empresasTransporte.length]
    const servicio = tiposServicio[i % tiposServicio.length]
    const duracionHoras = 5 + Math.floor(Math.random() * 14)
    const horaSalida = generarHoraAleatoria()
    const horaLlegada = sumarHoras(horaSalida, duracionHoras)
    const asientosDisponibles = Math.floor(Math.random() * 20)

    let estado = 'disponible'
    if (asientosDisponibles === 0) estado = 'agotado'
    else if (asientosDisponibles <= 4) estado = 'pocos-asientos'

    resultados.push({
      id: `${origen}-${destino}-${i}-${Date.now()}`,
      empresa: empresa.nombre,
      origen,
      destino,
      horaSalida,
      horaLlegada,
      duracion: `${duracionHoras} h`,
      tipoBus: servicio.nombre,
      servicios: serviciosPorTipo[servicio.nombre] ?? ['WiFi', 'Baño'],
      asientosDisponibles,
      precio: Math.round((35 + duracionHoras * 6 + Math.random() * 30) / 5) * 5,
      estado,
    })
  }

  return resultados.sort((a, b) => a.horaSalida.localeCompare(b.horaSalida))
}

// ---------------------------------------------------------------------------
// Selección de asiento — mapa de bus simulado (consciente de pisos)
// ---------------------------------------------------------------------------

// El número de pisos y la distribución de asientos dependen enteramente del
// tipo de servicio: los servicios de un piso solo declaran una entrada en
// `configuracionPisos`, los de dos pisos declaran dos. La interfaz nunca
// hardcodea "Piso 1 / Piso 2": simplemente recorre este arreglo.
const CONFIGURACION_POR_TIPO_BUS = {
  Económico: {
    configuracionPisos: [{ asientosPorLadoIzquierdo: 2, asientosPorLadoDerecho: 2, filas: 12 }],
  },
  'Semi Cama': {
    configuracionPisos: [{ asientosPorLadoIzquierdo: 2, asientosPorLadoDerecho: 2, filas: 11 }],
  },
  'Bus Cama': {
    configuracionPisos: [
      { asientosPorLadoIzquierdo: 2, asientosPorLadoDerecho: 1, filas: 9, descripcion: 'Más espacio para las piernas' },
      { asientosPorLadoIzquierdo: 1, asientosPorLadoDerecho: 1, filas: 8, descripcion: 'Asientos junto a la ventana' },
    ],
  },
  Prime: {
    configuracionPisos: [
      { asientosPorLadoIzquierdo: 2, asientosPorLadoDerecho: 1, filas: 8, descripcion: 'Cerca de la tripulación' },
      { asientosPorLadoIzquierdo: 1, asientosPorLadoDerecho: 1, filas: 7, descripcion: 'Mejores vistas del camino' },
    ],
  },
  Ultra: {
    configuracionPisos: [
      { asientosPorLadoIzquierdo: 1, asientosPorLadoDerecho: 1, filas: 7, descripcion: 'Cabinas junto al pasillo principal' },
      { asientosPorLadoIzquierdo: 1, asientosPorLadoDerecho: 1, filas: 6, descripcion: 'El mejor lugar del bus' },
    ],
  },
}

const LETRAS_IZQUIERDA = ['A', 'B']
const LETRAS_DERECHA = ['C', 'D']

// Regla de negocio del frontend: tope de asientos/pasajeros por compra.
export const MAXIMO_PASAJEROS_POR_COMPRA = 6

// Recargo fijo (frontend) de los asientos de las primeras filas de cada
// piso, ya usado antes de este cambio — se conserva la misma regla de
// precios existente en lugar de inventar una nueva.
const RECARGO_ASIENTO_PREFERENCIAL = 15

function crearGeneradorAleatorio(semillaInicial) {
  let semilla = semillaInicial
  return function siguienteAleatorio() {
    semilla = (semilla * 9301 + 49297) % 233280
    return semilla / 233280
  }
}

function generarPisoDeAsientos({ configuracionPiso, piso, disponiblesObjetivo, siguienteAleatorio }) {
  const { asientosPorLadoIzquierdo, asientosPorLadoDerecho, filas } = configuracionPiso

  const asientos = []
  for (let fila = 1; fila <= filas; fila += 1) {
    LETRAS_IZQUIERDA.slice(0, asientosPorLadoIzquierdo).forEach((letra) => {
      asientos.push({ numero: `${fila}${letra}`, fila, letra, lado: 'izquierda', piso })
    })
    LETRAS_DERECHA.slice(0, asientosPorLadoDerecho).forEach((letra) => {
      asientos.push({ numero: `${fila}${letra}`, fila, letra, lado: 'derecha', piso })
    })
  }

  const totalAsientos = asientos.length
  const disponiblesDeseados = Math.min(disponiblesObjetivo, totalAsientos - 1)
  const cantidadOcupados = Math.max(
    totalAsientos - Math.max(disponiblesDeseados, 0),
    Math.ceil(totalAsientos * 0.15),
  )

  const indicesOcupados = new Set()
  while (indicesOcupados.size < Math.min(cantidadOcupados, totalAsientos - 1)) {
    indicesOcupados.add(Math.floor(siguienteAleatorio() * totalAsientos))
  }

  const filaPreferencial = filas <= 2 ? 0 : 1

  return {
    piso,
    filas,
    asientosPorLado: [asientosPorLadoIzquierdo, asientosPorLadoDerecho],
    descripcion: configuracionPiso.descripcion,
    asientos: asientos.map((asiento, indice) => ({
      ...asiento,
      estado: indicesOcupados.has(indice) ? 'ocupado' : 'disponible',
      tipo: asiento.fila <= filaPreferencial + 1 ? 'preferencial' : 'estandar',
      precioAdicional: asiento.fila <= filaPreferencial + 1 ? RECARGO_ASIENTO_PREFERENCIAL : 0,
    })),
  }
}

/**
 * Genera de forma determinística (semilla = id del resultado) el plano de
 * asientos de un viaje. El número de pisos surge de los datos mock del tipo
 * de servicio: si el servicio solo define un piso, `pisos` vale 1 y la UI no
 * debe mostrar ningún selector de piso.
 * @param {import('../tipos').ResultadoViaje} resultado
 * @returns {{ pisos: number, mapaPorPiso: Record<number, { piso:number, filas:number, asientosPorLado:[number,number], descripcion?:string, asientos: import('../tipos').Asiento[] }> }}
 */
export function generarMapaAsientos(resultado) {
  const configuracion = CONFIGURACION_POR_TIPO_BUS[resultado.tipoBus] ?? CONFIGURACION_POR_TIPO_BUS['Semi Cama']
  const { configuracionPisos } = configuracion

  // Generador pseudoaleatorio con semilla, para que el mismo resultado
  // siempre produzca el mismo plano (evita que cambie en cada render).
  const semillaBase = Array.from(String(resultado.id)).reduce((acumulado, caracter) => acumulado + caracter.charCodeAt(0), 7)
  const siguienteAleatorio = crearGeneradorAleatorio(semillaBase)

  const capacidadTotal = configuracionPisos.reduce((total, configuracionPiso) => {
    const { asientosPorLadoIzquierdo, asientosPorLadoDerecho, filas } = configuracionPiso
    return total + (asientosPorLadoIzquierdo + asientosPorLadoDerecho) * filas
  }, 0)

  const mapaPorPiso = {}
  configuracionPisos.forEach((configuracionPiso, indice) => {
    const piso = indice + 1
    const { asientosPorLadoIzquierdo, asientosPorLadoDerecho, filas } = configuracionPiso
    const capacidadPiso = (asientosPorLadoIzquierdo + asientosPorLadoDerecho) * filas
    const proporcion = capacidadTotal > 0 ? capacidadPiso / capacidadTotal : 1
    const disponiblesObjetivo = Math.round(resultado.asientosDisponibles * proporcion)

    mapaPorPiso[piso] = generarPisoDeAsientos({ configuracionPiso, piso, disponiblesObjetivo, siguienteAleatorio })
  })

  return { pisos: configuracionPisos.length, mapaPorPiso }
}

function claveUsuario(usuarioId) {
  return `${CLAVE_PASAJES}${usuarioId}`
}

/**
 * Obtiene los pasajes del usuario, sembrando datos de ejemplo la
 * primera vez que se consulta una cuenta nueva.
 */
export function obtenerPasajesDeUsuario(usuarioId) {
  const crudo = localStorage.getItem(claveUsuario(usuarioId))
  if (!crudo) {
    const semilla = generarPasajesDemo(usuarioId)
    localStorage.setItem(claveUsuario(usuarioId), JSON.stringify(semilla))
    return semilla
  }
  return JSON.parse(crudo)
}

/**
 * Simula la compra de un resultado de búsqueda, generando un pasaje
 * confirmado y guardándolo en la cuenta del usuario.
 */
export async function comprarPasaje(usuarioId, resultadoViaje, fecha) {
  await retrasoSimulado(500)

  const numeroAsiento = `${Math.floor(Math.random() * 30) + 1}${['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)]}`

  const nuevoPasaje = {
    codigo: `RL-${Math.floor(10000 + Math.random() * 89999)}`,
    origen: resultadoViaje.origen,
    destino: resultadoViaje.destino,
    fecha,
    hora: resultadoViaje.horaSalida,
    empresa: resultadoViaje.empresa,
    tipoBus: resultadoViaje.tipoBus,
    asiento: numeroAsiento,
    precio: resultadoViaje.precio,
    estado: 'confirmado',
    usuarioId,
  }

  const pasajesActuales = obtenerPasajesDeUsuario(usuarioId)
  const actualizados = [nuevoPasaje, ...pasajesActuales]
  localStorage.setItem(claveUsuario(usuarioId), JSON.stringify(actualizados))

  return nuevoPasaje
}
