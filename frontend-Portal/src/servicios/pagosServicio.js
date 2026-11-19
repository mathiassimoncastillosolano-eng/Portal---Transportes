import { solicitarApi } from './httpCliente.js'

export const ESTADOS_ACTIVOS = new Set(['CREANDO', 'EN_PROCESO', 'ACCION_REQUERIDA'])

const TIMEOUT_INICIAR_MS = 45000
const TIMEOUT_CONSULTA_MS = 20000

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

export function nuevaClaveIdempotencia() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function esFalloTransitorio(error) {
  return Boolean(error?.sinRespuesta) || [502, 503, 504].includes(error?.status)
}

export async function iniciarPago(solicitud, opciones = {}) {
  const { intentos = 3, esperaMs = 2500, dormir = esperar, enviar = solicitarApi } = opciones
  if ('monto' in solicitud || 'importe' in solicitud) {
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

export function obtenerConfiguracionPago({ enviar = solicitarApi } = {}) {
  return enviar('/api/pagos/configuracion', { timeoutMs: TIMEOUT_CONSULTA_MS })
}

export function confirmar3ds(referencia, cuerpo, { enviar = solicitarApi } = {}) {
  return enviar(`/api/pagos/${encodeURIComponent(referencia)}/3ds`, {
    method: 'POST',
    body: JSON.stringify(cuerpo),
    timeoutMs: TIMEOUT_INICIAR_MS,
  })
}

export function consultarPago(referencia, { enviar = solicitarApi } = {}) {
  return enviar(`/api/pagos/${encodeURIComponent(referencia)}`, { timeoutMs: TIMEOUT_CONSULTA_MS })
}

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

const PREFIJO_PAGO = 'rutalibre:pago-en-curso:'

export function guardarPagoEnCurso(idViaje, referencia) {
  try {
    sessionStorage.setItem(`${PREFIJO_PAGO}${idViaje}`, referencia)
  } catch {
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
  }
}
