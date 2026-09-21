import { empresasTransporte } from './empresas'

/**
 * Genera un lote de pasajes simulados para un usuario recién registrado
 * o para la cuenta de demostración. No proviene de ningún backend real.
 * @param {string} usuarioId
 * @returns {import('../tipos').Pasaje[]}
 */
export function generarPasajesDemo(usuarioId) {
  const base = [
    {
      codigo: 'RL-84210',
      origen: 'Lima',
      destino: 'Cusco',
      fecha: '2026-09-22',
      hora: '20:30',
      empresa: empresasTransporte[0].nombre,
      tipoBus: 'Bus Cama',
      asiento: '14A',
      precio: 145,
      estado: 'confirmado',
    },
    {
      codigo: 'RL-77935',
      origen: 'Lima',
      destino: 'Ica',
      fecha: '2026-07-03',
      hora: '07:15',
      empresa: empresasTransporte[3].nombre,
      tipoBus: 'Semi Cama',
      asiento: '08C',
      precio: 45,
      estado: 'completado',
    },
    {
      codigo: 'RL-65102',
      origen: 'Arequipa',
      destino: 'Lima',
      fecha: '2026-05-18',
      hora: '21:00',
      empresa: empresasTransporte[1].nombre,
      tipoBus: 'Ultra',
      asiento: '02A',
      precio: 210,
      estado: 'completado',
    },
  ]
  return base.map((pasaje) => ({ ...pasaje, usuarioId }))
}
