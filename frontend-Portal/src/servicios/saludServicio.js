import { URL_BASE_API } from './httpCliente.js'
import { clasificarRespuesta, RESULTADOS, TIEMPOS_INICIO } from '../utilidades/inicializacion.js'

// Comprobación de disponibilidad del backend (GET /api/health/ready).
//
// No usa solicitarApi a propósito: aquí no se envía el token JWT (el health check es público y no
// debe depender de la sesión), no se añade Content-Type (así la petición es "simple" y no genera
// preflight CORS) y un 503 no es una excepción sino un estado esperado durante el arranque.
// La URL sale de URL_BASE_API (VITE_API_URL), la misma que usa el resto de servicios.

export const RUTA_READINESS = '/api/health/ready'

async function leerJson(respuesta) {
  const tipo = respuesta.headers?.get?.('content-type') ?? ''
  if (!tipo.includes('json')) return null
  try {
    return await respuesta.json()
  } catch {
    return null
  }
}

/**
 * Hace UNA comprobación y nunca lanza: devuelve `{ tipo, status? }` (ver RESULTADOS) o
 * `{ tipo: 'CANCELADO' }` si se abortó desde fuera.
 */
export async function consultarDisponibilidad({
  signal,
  timeoutMs = TIEMPOS_INICIO.timeoutSolicitud,
  fetchImpl = globalThis.fetch,
  urlBase = URL_BASE_API,
} = {}) {
  if (signal?.aborted) return { tipo: 'CANCELADO' }

  const controlador = new AbortController()
  const abortar = () => controlador.abort()
  signal?.addEventListener('abort', abortar, { once: true })
  const temporizador = setTimeout(abortar, timeoutMs)

  try {
    const respuesta = await fetchImpl(`${urlBase}${RUTA_READINESS}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
      signal: controlador.signal,
    })
    const cuerpo = await leerJson(respuesta)
    return clasificarRespuesta(respuesta.status, cuerpo)
  } catch {
    if (signal?.aborted) return { tipo: 'CANCELADO' }
    // Timeout, CORS o red: para el usuario es lo mismo, el servidor todavía no responde.
    return { tipo: RESULTADOS.CONECTANDO, status: 0, timeout: controlador.signal.aborted }
  } finally {
    clearTimeout(temporizador)
    signal?.removeEventListener('abort', abortar)
  }
}
