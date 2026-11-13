// Reprogramación · Operaciones con el backend para elegir UN asiento.
// Reutiliza los endpoints de la compra normal (viajesServicio.js): sesión,
// bloquear y liberar. Aquí solo se agrega la regla propia de la reprogramación:
// el pasajero puede tener un único asiento bloqueado a la vez.

import {
  bloquearAsiento,
  borrarSesionAsientos,
  liberarAsiento,
  obtenerMapaAsientosViaje,
} from './viajesServicio.js'

const ESTADOS_SESION_VENCIDA = [401, 410]
const ESTADO_ASIENTO_TOMADO = 409

// 401 (token inválido) y 410 (sesión vencida) significan que la reserva ya no existe.
export function esSesionVencida(error) {
  return ESTADOS_SESION_VENCIDA.includes(error?.status)
}

// 409: otra persona bloqueó u ocupó el asiento antes que yo.
export function esAsientoTomado(error) {
  return error?.status === ESTADO_ASIENTO_TOMADO
}

// Libera un asiento que yo tenía. Si el backend responde 409 es que ya no estaba
// bloqueado a mi nombre (se liberó antes o venció): el resultado buscado ya se
// cumplió, así que no es un error. Cualquier otro fallo sí se propaga.
export async function liberarAsientoPropio(idViaje, tokenSesion, idAsiento) {
  try {
    await liberarAsiento(idViaje, idAsiento, tokenSesion)
  } catch (error) {
    if (!esAsientoTomado(error)) throw error
  }
}

// Cambia el asiento elegido. Primero bloquea el nuevo y recién después libera los
// anteriores: si el bloqueo falla (p. ej. alguien lo tomó), el pasajero no pierde
// el asiento que ya tenía. Los fallos al liberar NO se ocultan: la pantalla los
// muestra y vuelve a pedir el mapa para mostrar lo que realmente hay en el backend.
export async function cambiarAsientoElegido(idViaje, tokenSesion, idsAnteriores, idNuevo) {
  await bloquearAsiento(idViaje, idNuevo, tokenSesion)
  for (const idAnterior of idsAnteriores) {
    await liberarAsientoPropio(idViaje, tokenSesion, idAnterior)
  }
}

// Deja de reservar: libera el asiento (si había uno) y olvida la sesión guardada.
// Nunca lanza error: se usa al salir de la pantalla y no debe interrumpirla.
export async function cerrarReserva(idViaje, tokenSesion, idAsiento) {
  try {
    if (tokenSesion && idAsiento != null) await liberarAsiento(idViaje, idAsiento, tokenSesion)
  } catch {
    // Si falla, el backend lo libera cuando vence el bloqueo.
  }
  borrarSesionAsientos(idViaje)
}

// Al vencer la sesión, consultar el mapa obliga al backend a liberar los
// bloqueos vencidos de este viaje (así lo hace la compra normal).
export async function forzarLiberacionDeVencidos(idViaje) {
  try {
    await obtenerMapaAsientosViaje(idViaje)
  } catch {
    // No es bloqueante: el pasajero igual vuelve a elegir viaje.
  }
}
