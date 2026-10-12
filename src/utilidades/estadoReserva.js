// Estado de reserva de un viaje en la interfaz.
//
// La regla vive en el backend (PoliticaReservaViaje): el servidor entrega
// `estadoReserva`, `salidaMs`, `limiteReservaMs` y `ahoraServidorMs`. Aquí solo se
// *refresca* ese estado con el paso del tiempo (una tarjeta "disponible" pasa a
// "reserva cerrada" o "salida realizada" sin recargar), usando el reloj del
// servidor corregido por el desfase del navegador. El backend vuelve a validar
// siempre al crear la sesión, bloquear asientos y pagar.

export const MINUTOS_ANTICIPACION_POR_DEFECTO = 20

export const ESTADOS_RESERVA = Object.freeze({
  DISPONIBLE: 'DISPONIBLE',
  RESERVA_CERRADA: 'RESERVA_CERRADA',
  SALIDA_REALIZADA: 'SALIDA_REALIZADA',
  LLENO: 'LLENO',
  SIN_INFORMACION: 'SIN_INFORMACION',
  NO_DISPONIBLE: 'NO_DISPONIBLE',
})

/** Desfase (ms) a sumar a Date.now() para obtener la hora del servidor. */
export function calcularDesfaseServidor(resultados, ahoraNavegadorMs = Date.now()) {
  const conReloj = (resultados ?? []).find((r) => Number.isFinite(r?.ahoraServidorMs))
  return conReloj ? conReloj.ahoraServidorMs - ahoraNavegadorMs : 0
}

/**
 * Estado de reserva vigente en `ahoraMs` (hora del servidor, en ms epoch).
 * Si el resultado no trae los campos nuevos (servidor antiguo) se degrada a la
 * lógica previa: agotado u disponible.
 */
export function estadoReservaActual(resultado, ahoraMs) {
  if (!resultado) return ESTADOS_RESERVA.NO_DISPONIBLE
  const base = resultado.estadoReserva
  if (!base) {
    return resultado.estado === 'agotado' || resultado.asientosDisponibles === 0
      ? ESTADOS_RESERVA.LLENO : ESTADOS_RESERVA.DISPONIBLE
  }
  if (base === ESTADOS_RESERVA.NO_DISPONIBLE) return base
  if (Number.isFinite(resultado.salidaMs) && ahoraMs >= resultado.salidaMs) {
    return ESTADOS_RESERVA.SALIDA_REALIZADA
  }
  if (base === ESTADOS_RESERVA.DISPONIBLE &&
      Number.isFinite(resultado.limiteReservaMs) && ahoraMs > resultado.limiteReservaMs) {
    return ESTADOS_RESERVA.RESERVA_CERRADA
  }
  return base
}

export function esReservable(resultado, ahoraMs) {
  return estadoReservaActual(resultado, ahoraMs) === ESTADOS_RESERVA.DISPONIBLE
}

/** true si el error HTTP es el rechazo de reserva por tiempo/estado del viaje (409 con marca). */
export function esReservaNoPermitida(error) {
  return error?.status === 409 && Array.isArray(error.detalles) && error.detalles.includes('RESERVA_NO_PERMITIDA')
}

/** Texto principal / secundario para cada estado no reservable. */
export const TEXTOS_ESTADO_RESERVA = Object.freeze({
  SALIDA_REALIZADA: { insignia: 'Salida realizada', detalle: 'Este bus ya salió.', boton: 'Viaje finalizado' },
  RESERVA_CERRADA: {
    insignia: 'Reserva cerrada',
    detalle: 'Se requiere reservar con al menos 20 minutos de anticipación.',
    boton: 'Reserva cerrada',
  },
  LLENO: { insignia: 'Bus lleno', detalle: 'Sin asientos disponibles.', boton: 'Sin cupo' },
  SIN_INFORMACION: { insignia: 'Sin información', detalle: 'No hay información de asientos para este viaje.', boton: 'No disponible' },
  NO_DISPONIBLE: { insignia: 'No disponible', detalle: 'Este viaje no está disponible para reservas.', boton: 'No disponible' },
})
