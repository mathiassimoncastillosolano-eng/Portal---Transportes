import { solicitarApi } from './httpCliente.js'

// Compras, boletos e historial del usuario autenticado. Todas las rutas cuelgan de /api/usuarios/perfil y
// el backend identifica al usuario por el JWT: aquí nunca se envía un id de usuario. Cada función acepta
// `enviar` (por defecto solicitarApi) para poder probarla sin red.

const BASE = '/api/usuarios/perfil'

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje)
}

/** @returns {Promise<{pasajes:number, viajesCompletados:number, tickets:number, comprasVigentes:number}>} */
export async function obtenerResumenPerfil({ enviar = solicitarApi } = {}) {
  const datos = await enviar(`${BASE}/resumen`, { method: 'GET' })
  exigir(datos && ['pasajes', 'viajesCompletados', 'tickets', 'comprasVigentes'].every((k) => Number.isFinite(datos[k])),
    'La respuesta del resumen no es válida.')
  return datos
}

/** Todas las compras: las vigentes primero. @returns {Promise<{comprasVigentes:number, compras:object[]}>} */
export async function listarCompras({ enviar = solicitarApi } = {}) {
  const datos = await enviar(`${BASE}/pasajes`, { method: 'GET' })
  exigir(datos && Array.isArray(datos.compras), 'La respuesta de compras no es válida.')
  return datos
}

/** Compras que ya no están vigentes (realizadas, canceladas, reembolsadas o sin confirmar). */
export async function listarHistorial({ enviar = solicitarApi } = {}) {
  const datos = await enviar(`${BASE}/historial`, { method: 'GET' })
  exigir(Array.isArray(datos), 'La respuesta del historial no es válida.')
  return datos
}

/** Detalle de UNA compra propia. El backend responde 404 si no existe o es de otra cuenta. */
export async function obtenerCompra(idVenta, { enviar = solicitarApi } = {}) {
  const id = Number(idVenta)
  exigir(Number.isInteger(id) && id > 0, 'El identificador de la compra no es válido.')
  const datos = await enviar(`${BASE}/pasajes/${id}`, { method: 'GET' })
  exigir(datos && Array.isArray(datos.boletos), 'La respuesta de la compra no es válida.')
  return datos
}
