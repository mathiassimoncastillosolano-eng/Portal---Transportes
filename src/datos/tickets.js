/**
 * Convierte un pasaje comprado en la representación de un ticket
 * electrónico para su presentación visual (código QR simulado incluido).
 * @param {import('../tipos').Pasaje} pasaje
 * @param {string} nombrePasajero
 */
export function construirTicketDesdePasaje(pasaje, nombrePasajero) {
  return {
    ...pasaje,
    pasajero: nombrePasajero,
    qrSemilla: pasaje.codigo,
  }
}
