import { boletosDemo } from '../datos/boletosDemo.js'

/**
 * Punto de integración de T-39. En desarrollo devuelve ejemplos; en producción
 * declara la integración pendiente sin inventar compras. Cuando exista GET,
 * reemplazar solo esta función
 * por solicitarApi(...), con el JWT del cliente; no enviar un id de usuario.
 *
 * Contrato esperado por la vista: { codigo, estado, origen, destino, fecha,
 * hora, empresa, tipoBus, asiento, precio, pasajero: { nombres, apellidos } }.
 * Cada boleto corresponde a un pasajero y un asiento.
 */
export async function listarBoletosDelUsuario() {
  if (import.meta.env.DEV) return { boletos: boletosDemo(), fuente: 'demostracion' }
  return { boletos: [], fuente: 'pendiente' }
}
