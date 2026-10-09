import { generarPasajesDemo } from '../datos/pasajes.js'
import { solicitarApi, URL_BASE_API } from './httpCliente.js'

// La búsqueda consulta la base real. Las funciones de asientos y compra
// que siguen pertenecen a los módulos de demostración pendientes de integrar.
const CLAVE_PASAJES = 'rutalibre:pasajes:'
function retrasoSimulado(ms = 620) {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

export async function buscarViajes({ origen, destino, fecha, horario = 'cualquiera' }) {
  if (!origen?.trim() || !destino?.trim() || !fecha) {
    throw new Error('Origen, destino y fecha son obligatorios.')
  }
  const parametros = new URLSearchParams({ origen: origen.trim(), destino: destino.trim(), fecha, horario })
  const viajes = await solicitarApi(`/api/viajes/buscar?${parametros}`, { autenticar: false })
  if (!Array.isArray(viajes)) throw new Error('El servidor devolvió una respuesta de viajes no válida.')
  return viajes
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

// ---------------------------------------------------------------------------
// Asientos reales (backend): sesión, bloqueo al clic y tiempo real (SSE)
// ---------------------------------------------------------------------------

// El EventSource no pasa por solicitarApi: necesita la URL absoluta.
// Si httpCliente.js usa otra URL base, pon aquí la misma.
const PREFIJO_SESION = 'rutalibre:sesion-asientos:'

function leerSesionGuardada(idViaje) {
  try {
    const crudo = sessionStorage.getItem(`${PREFIJO_SESION}${idViaje}`)
    if (!crudo) return null
    const sesion = JSON.parse(crudo)
    return sesion?.tokenSesion && sesion.expiraEn > Date.now() ? sesion : null
  } catch {
    return null
  }
}

export function borrarSesionAsientos(idViaje) {
  try {
    sessionStorage.removeItem(`${PREFIJO_SESION}${idViaje}`)
  } catch {
    // sin sessionStorage no hay nada que borrar
  }
}

/**
 * Reutiliza la sesión guardada del viaje (sobrevive a recargas) o crea una
 * nueva. `expiraEn` es un timestamp en ms calculado con segundosRestantes
 * del servidor + Date.now() al recibirlo (no depende del reloj del PC).
 * @returns {Promise<{ tokenSesion: string, expiraEn: number }>}
 */
const sesionesEnCurso = new Map() // idViaje -> promesa

export function obtenerOCrearSesion(idViaje) {
  const guardada = leerSesionGuardada(idViaje)
  if (guardada) return Promise.resolve(guardada)

  if (sesionesEnCurso.has(idViaje)) return sesionesEnCurso.get(idViaje)

  const promesa = solicitarApi(`/api/viajes/${idViaje}/sesiones`, {
    method: 'POST',
    autenticar: false,
  })
    .then((respuesta) => {
      const sesion = {
        tokenSesion: respuesta.tokenSesion,
        expiraEn: Date.now() + respuesta.segundosRestantes * 1000,
      }
      try {
        sessionStorage.setItem(`${PREFIJO_SESION}${idViaje}`, JSON.stringify(sesion))
      } catch {
        // no bloqueante
      }
      return sesion
    })
    .finally(() => sesionesEnCurso.delete(idViaje))

  sesionesEnCurso.set(idViaje, promesa)
  return promesa
}

export async function obtenerMapaAsientosViaje(idViaje, tokenSesion) {
  const consulta = tokenSesion ? `?tokenSesion=${encodeURIComponent(tokenSesion)}` : ''
  const respuesta = await solicitarApi(`/api/viajes/${idViaje}/asientos${consulta}`, { autenticar: false })
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
        estado: asiento.estado, // 'disponible' | 'bloqueado' | 'ocupado'
        esMio: Boolean(asiento.esMio),
        precio: asiento.precio,
      })),
    }
  })

  return { pisos: respuesta.pisos ?? listaPisos.length, mapaPorPiso }
}

/** Bloquea un asiento para esta sesión (al hacer clic). 409 = tomado o tope de 6; 410/401 = sesión vencida. */
export async function bloquearAsiento(idViaje, idAsiento, tokenSesion) {
  return solicitarApi(`/api/viajes/${idViaje}/asientos/${idAsiento}/bloquear`, {
    method: 'POST',
    autenticar: false,
    body: JSON.stringify({ tokenSesion }),
  })
}

/** Libera un asiento de esta sesión (204 sin cuerpo). */
export async function liberarAsiento(idViaje, idAsiento, tokenSesion) {
  try {
    await solicitarApi(`/api/viajes/${idViaje}/asientos/${idAsiento}/liberar`, {
      method: 'POST',
      autenticar: false,
      body: JSON.stringify({ tokenSesion }),
    })
  } catch (error) {
    // Errores HTTP reales (409/410/401...) se propagan. Un fallo sin status
    // suele ser solo el parseo de la respuesta 204 vacía: se ignora.
    if (error?.status) throw error
  }
}

/**
 * Abre el canal SSE del viaje. Devuelve la función para cerrarlo.
 * alAbrir se llama al conectar y en CADA reconexión (recargar el mapa completo).
 * alAsiento recibe { idAsiento, estado }.
 */
export function abrirEventosAsientos(idViaje, { alAbrir, alAsiento }) {
  const fuente = new EventSource(`${URL_BASE_API}/api/viajes/${idViaje}/asientos/eventos`)
  fuente.onopen = () => alAbrir?.()
  fuente.addEventListener('asiento', (evento) => {
    try {
      alAsiento?.(JSON.parse(evento.data))
    } catch {
      // evento mal formado: se ignora
    }
  })
  return () => fuente.close()
}

/**
 * "Continuar al pago": valida los pasajeros en el servidor (POST /api/viajes/{id}/pasajeros) y los deja en
 * una caché TEMPORAL del backend, ligada a la sesión. No escribe en la base de datos ni ocupa asientos.
 *
 * Errores de DATOS llegan como 200 con valido:false y la lista `errores`
 * ({ idAsiento, campo, mensaje }); NO se lanzan. Los errores de sesión o asientos sí se lanzan
 * con `error.status`: 401 token inválido, 410 sesión vencida, 409 asientos no disponibles.
 * @returns {Promise<{ valido: boolean, errores: Array<{ idAsiento: number, campo: string, mensaje: string }> }>}
 */
export async function guardarPasajeros(idViaje, tokenSesion, pasajeros) {
  const respuesta = await solicitarApi(`/api/viajes/${idViaje}/pasajeros`, {
    method: 'POST',
    autenticar: false,
    body: JSON.stringify({ tokenSesion, pasajeros }),
  })
  const errores = Array.isArray(respuesta?.errores) ? respuesta.errores : []
  return { valido: respuesta?.valido !== false && errores.length === 0, errores }
}

/**
 * TEMPORAL (solo desarrollo): simula la confirmación del pago llamando a
 * POST /api/viajes/{id}/confirmar-demo. Guarda en PostgreSQL los pasajeros de la caché y pasa los
 * asientos a OCUPADO. Existe únicamente si el backend tiene reserva.confirmacion-demo=true; si no,
 * responde 404. NO cobra nada. Retirar cuando exista el POST /api/pagos real.
 */
export async function confirmarCompraDemo(idViaje, tokenSesion) {
  return solicitarApi(`/api/viajes/${idViaje}/confirmar-demo`, {
    method: 'POST',
    autenticar: false,
    body: JSON.stringify({ tokenSesion }),
  })
}
