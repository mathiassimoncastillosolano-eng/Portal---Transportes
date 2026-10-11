// Cliente HTTP minimo para hablar con el backend real de RutaLibre
// (Spring Boot). Centraliza la URL base, el envío del token JWT en el
// encabezado Authorization y el manejo uniforme de errores devueltos por
// la API (ver RespuestaError en el backend).

export const URL_BASE_API = (import.meta.env?.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')

const CLAVE_TOKEN = 'rutalibre:token'

export function guardarToken(token) {
  localStorage.setItem(CLAVE_TOKEN, token)
}

export function obtenerToken() {
  return localStorage.getItem(CLAVE_TOKEN)
}

export function eliminarToken() {
  localStorage.removeItem(CLAVE_TOKEN)
}

/**
 * Realiza una petición a la API del backend, adjuntando automáticamente el
 * token JWT (si existe) y traduciendo respuestas de error al formato
 * `RespuestaError` del backend en una excepción de JavaScript con un
 * mensaje legible para mostrar en la interfaz.
 */
export async function solicitarApi(ruta, opciones = {}) {
  const { autenticar = true, timeoutMs, ...opcionesFetch } = opciones
  const token = autenticar ? obtenerToken() : null

  const encabezados = {
    'Content-Type': 'application/json',
    ...(opciones.headers ?? {}),
  }

  if (token) {
    encabezados.Authorization = `Bearer ${token}`
  }

  // timeoutMs (opcional): corta la espera. El error lleva sinRespuesta = true para que el llamador sepa
  // que el resultado es DESCONOCIDO (la solicitud pudo llegar al servidor) y no lo trate como un rechazo.
  const controlador = timeoutMs ? new AbortController() : null
  const temporizador = controlador ? setTimeout(() => controlador.abort(), timeoutMs) : null

  let respuesta
  try {
    respuesta = await fetch(`${URL_BASE_API}${ruta}`, {
      ...opcionesFetch,
      headers: encabezados,
      ...(controlador ? { signal: controlador.signal } : {}),
    })
  } catch (error) {
    const sinConexion = new Error(
      controlador?.signal.aborted
        ? 'El servidor está tardando en responder.'
        : 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
    )
    sinConexion.sinRespuesta = true
    throw sinConexion
  } finally {
    if (temporizador) clearTimeout(temporizador)
  }

  const tieneCuerpo = respuesta.status !== 204
  const cuerpo = tieneCuerpo ? await respuesta.json().catch(() => null) : null

  if (!respuesta.ok) {
    const mensaje = cuerpo?.mensaje ?? 'Ocurrió un error al comunicarse con el servidor.'
    const error = new Error(mensaje)
    error.status = respuesta.status
    error.detalles = cuerpo?.detalles ?? null
    throw error
  }

  return cuerpo
}
