import { solicitarApi } from './httpCliente.js'

const BASE = '/api/reclamos'
const CLAVE_RECIENTE = 'rutalibre:reclamo-reciente'

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje)
}

export async function obtenerProveedor({ enviar = solicitarApi } = {}) {
  const datos = await enviar(`${BASE}/proveedor`, { method: 'GET', autenticar: false })
  exigir(datos && typeof datos === 'object', 'La respuesta del proveedor no es válida.')
  return datos
}

export async function registrarReclamo(payload, { enviar = solicitarApi } = {}) {
  const datos = await enviar(BASE, { method: 'POST', body: JSON.stringify(payload), timeoutMs: 30000 })
  exigir(datos?.constancia?.codigo && datos?.tokenConsulta, 'La respuesta del registro no es válida.')
  return datos
}

export async function consultarReclamo(codigo, token, { enviar = solicitarApi } = {}) {
  exigir(codigo && token, 'Faltan los datos de consulta.')
  const datos = await enviar(`${BASE}/${encodeURIComponent(codigo)}`, {
    method: 'GET',
    autenticar: false,
    headers: { 'X-Token-Consulta': token },
  })
  exigir(datos?.codigo, 'La respuesta de la consulta no es válida.')
  return datos
}

export function guardarReclamoReciente(codigo, token) {
  try {
    sessionStorage.setItem(CLAVE_RECIENTE, JSON.stringify({ codigo, token }))
  } catch {
    return
  }
}

export function leerReclamoReciente() {
  try {
    const crudo = sessionStorage.getItem(CLAVE_RECIENTE)
    const datos = crudo ? JSON.parse(crudo) : null
    return datos?.codigo && datos?.token ? datos : null
  } catch {
    return null
  }
}

export function olvidarReclamoReciente() {
  try {
    sessionStorage.removeItem(CLAVE_RECIENTE)
  } catch {
    return
  }
}
