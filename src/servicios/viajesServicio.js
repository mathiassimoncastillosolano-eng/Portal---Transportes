import { empresasTransporte } from '../datos/empresas'
import { tiposServicio } from '../datos/servicios'
import { generarPasajesDemo } from '../datos/pasajes'
import { solicitarApi } from './httpCliente'

// Todas las funciones de este archivo simulan un backend real. Los
// resultados se generan en el navegador a partir de datos estáticos y
// nunca se realiza ninguna petición de red.

const CLAVE_PASAJES = 'rutalibre:pasajes:'

function retrasoSimulado(ms = 620) {
  return new Promise((resolver) => setTimeout(resolver, ms))
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

  export const ID_VIAJE_PRUEBA = 2

function generarTokenBloqueo() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `token-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Trae el mapa de asientos real de un viaje y lo adapta a la misma forma
 * que generarMapaAsientos() (mock), para no tener que tocar los
 * componentes de UI (SelectorPiso, MapaAsientosBus, etc).
 *
 * ⚠️ Los nombres de campo exactos del JSON que devuelve el backend
 * (MapaAsientosViajeDTO / PisoMapaDTO / AsientoDisponibilidadDTO) son una
 * suposición razonable basada en los nombres de las clases y en cómo se
 * describió el contrato — hay que confirmarlos contra una respuesta real
 * y ajustar `adaptarMapaAsientosBackend` si difieren.
 */
export async function obtenerMapaAsientosViaje(idViaje) {
  const respuesta = await solicitarApi(`/api/viajes/${idViaje}/asientos`)
  return adaptarMapaAsientosBackend(respuesta)
}

function adaptarMapaAsientosBackend(respuesta) {
  const listaPisos = Object.values(respuesta.mapaPorPiso ?? {})

  const mapaPorPiso = {}
  listaPisos.forEach((piso) => {
    mapaPorPiso[piso.piso] = {
      piso: piso.piso,
      filas: piso.filas,
      asientosPorLado: piso.asientosPorLado,
      descripcion: piso.descripcion,
      asientos: (piso.asientos ?? []).map((asiento) => ({
        idAsiento: asiento.idAsiento,
        numero: asiento.numero,
        fila: asiento.fila,
        letra: asiento.letra,
        lado: asiento.lado,
        piso: piso.piso,
        estado: asiento.estado, // 'disponible' | 'ocupado' (el backend no distingue 'bloqueado')
        precio: asiento.precio, // precio absoluto de este asiento, no un recargo
      })),
    }
  })

  return { pisos: respuesta.pisos ?? listaPisos.length, mapaPorPiso }
}

/**
 * Bloquea temporalmente un asiento y registra al pasajero en un solo
 * paso, usando POST /bloquear (ya validado). Devuelve el tokenBloqueo
 * generado para poder liberarlo después si hace falta.
 */
export async function bloquearAsiento(idViaje, idAsiento, datosPasajero) {
  const tokenBloqueo = generarTokenBloqueo()

  const respuesta = await solicitarApi(`/api/viajes/${idViaje}/asientos/${idAsiento}/bloquear`, {
    method: 'POST',
    body: JSON.stringify({
      tokenBloqueo,
      tipoDocumento: datosPasajero.tipoDocumento,
      numeroDocumento: datosPasajero.numeroDocumento,
      nombres: datosPasajero.nombres,
      apellidos: datosPasajero.apellidos,
      fechaNacimiento: datosPasajero.fechaNacimiento,
    }),
  })

  return { ...respuesta, tokenBloqueo }
}

/**
 * Libera un asiento previamente bloqueado por este cliente (mismo
 * tokenBloqueo), usando POST /liberar (ya validado). Silencioso ante
 * errores: si ya expiró o ya se liberó, no debe romper la UI.
 */
export async function liberarAsiento(idViaje, idAsiento, tokenBloqueo) {
  if (!tokenBloqueo) return
  try {
    await solicitarApi(`/api/viajes/${idViaje}/asientos/${idAsiento}/liberar`, {
      method: 'POST',
      body: JSON.stringify({ tokenBloqueo }),
    })
  } catch {
    // No bloqueante: si el token ya expiró o el asiento ya se liberó,
    // no hay nada que el usuario deba ver.
  }

}
