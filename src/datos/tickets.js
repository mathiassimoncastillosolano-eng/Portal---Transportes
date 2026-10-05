import { nombreDelPasajero } from '../utilidades/pasajesVista.js'

/** Presenta los datos de un boleto sin inventar el pasajero ni un QR válido. */
export function construirTicketDesdePasaje(pasaje) {
  return { ...pasaje, pasajero: nombreDelPasajero(pasaje) }
}
