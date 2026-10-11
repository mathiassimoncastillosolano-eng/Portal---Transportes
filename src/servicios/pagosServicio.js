// Pagos con Mercado Pago (Checkout API vía Orders) a través del backend de RutaLibre.
//
// Reglas de seguridad del flujo:
//  - El navegador NUNCA envía el importe: el backend lo calcula con los asientos bloqueados.
//  - El navegador NUNCA decide si un pago está aprobado: solo muestra el estado que devuelve el backend,
//    que a su vez lo verifica consultando la order en Mercado Pago.
//  - Cada intento de pago lleva una clave de idempotencia. Si la respuesta se pierde (timeout, Render
//    despertando), se reenvía la MISMA solicitud con la MISMA clave: el backend devuelve la misma operación
//    y nunca crea una segunda order.

import { solicitarApi } from './httpCliente.js'

export const ESTADOS_ACTIVOS = new Set(['CREANDO', 'EN_PROCESO', 'ACCION_REQUERIDA'])

const TIMEOUT_INICIAR_MS = 45000
const TIMEOUT_CONSULTA_MS = 20000

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

/** Clave única por intento de pago (no por clic): se reutiliza en los reenvíos del mismo intento. */
export function nuevaClaveIdempotencia() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Un fallo es "reintentable sin riesgo" si no hubo respuesta o el servidor no estaba disponible. */
export function esFalloTransitorio(error) {
  return Boolean(error?.sinRespuesta) || [502, 503, 504].includes(error?.status)
}

/**
 * POST /api/pagos. Reenvía la misma solicitud (misma clave) ante fallos transitorios.
 * @param {object} solicitud cuerpo SIN importe (ver construirSolicitudPago* en utilidades/pagoMercadoPago)
 * @param {{ intentos?: number, esperaMs?: number, dormir?: (ms:number)=>Promise<void>, enviar?: Function }} [opciones]
 */
export async function iniciarPago(solicitud, opciones = {}) {
  const { intentos = 3, esperaMs = 2500, dormir = esperar, enviar = solicitarApi } = opciones
  if ('monto' in solicitud || 'transaction_amount' in solicitud) {
    throw new Error('La solicitud de pago no debe incluir el importe.')
  }
  let ultimoError
  for (let intento = 1; intento <= intentos; intento += 1) {
    try {
      return await enviar('/api/pagos', {
        method: 'POST',
        body: JSON.stringify(solicitud),
        timeoutMs: TIMEOUT_INICIAR_MS,
      })
    } catch (error) {
      ultimoError = error
      if (!esFalloTransitorio(error) || intento === intentos) break
      await dormir(esperaMs * intento)
    }
  }
  throw ultimoError
}

/** GET /api/pagos/{referencia}: estado verificado por el backend. */
export function consultarPago(referencia, { enviar = solicitarApi } = {}) {
  return enviar(`/api/pagos/${encodeURIComponent(referencia)}`, { timeoutMs: TIMEOUT_CONSULTA_MS })
}

/**
 * Consulta periódicamente el estado hasta que deje de estar activo o se agote el tiempo.
 * Nunca lanza por errores de red: los cuenta como "sin novedades" y sigue esperando.
 *
 * @returns {Promise<{ respuesta: object|null, agotado: boolean }>} agotado = true si el resultado sigue sin conocerse
 */
export async function esperarResultadoPago(referencia, opciones = {}) {
  const {
    consultar = consultarPago,
    alActualizar = () => {},
    intervaloMs = 2500,
    maxEsperaMs = 120000,
    dormir = esperar,
    ahora = () => Date.now(),
    cancelado = () => false,
    pausar = () => false,
    // Permite esperar más en ciertos estados (p. ej. el desafío 3DS, que el banco mantiene hasta 40 min).
    limitePara = () => maxEsperaMs,
  } = opciones
  const inicio = ahora()
  let ultima = null
  while (!cancelado()) {
    if (!pausar()) {
      try {
        ultima = await consultar(referencia)
        alActualizar(ultima)
        if (!ESTADOS_ACTIVOS.has(ultima?.estado)) return { respuesta: ultima, agotado: false }
      } catch (error) {
        if (error?.status === 404 || error?.status === 401) throw error
      }
    }
    if (ahora() >= inicio + limitePara(ultima)) return { respuesta: ultima, agotado: true }
    await dormir(intervaloMs)
  }
  return { respuesta: ultima, agotado: false }
}

// ---------------------------------------------------------------------------
// Pago en curso guardado (sobrevive a una recarga de la página)
// ---------------------------------------------------------------------------

const PREFIJO_PAGO = 'rutalibre:pago-en-curso:'

export function guardarPagoEnCurso(idViaje, referencia) {
  try {
    sessionStorage.setItem(`${PREFIJO_PAGO}${idViaje}`, referencia)
  } catch {
    // sin almacenamiento: el pago sigue, solo no se podrá retomar tras recargar
  }
}

export function leerPagoEnCurso(idViaje) {
  try {
    return sessionStorage.getItem(`${PREFIJO_PAGO}${idViaje}`)
  } catch {
    return null
  }
}

export function borrarPagoEnCurso(idViaje) {
  try {
    sessionStorage.removeItem(`${PREFIJO_PAGO}${idViaje}`)
  } catch {
    // nada que borrar
  }
}
