import type { Canal, Totales } from './modelo'
import type { FilaRanking } from './datosOperacionEjemplo'
import { repartir, rutasPorCanalEjemplo } from './datosOperacionEjemplo'

export interface VentaDetalle {
  ruta: string
  ciudadSalida: string
  servicio: string
  pasajes: number
  ingresos: number
  viajes: number
}

const servicios = ['Bus Cama', 'Estándar', 'Prime', 'Semi Cama']
const pesosPasajes = [0.175, 0.33, 0.09, 0.405]
const factoresPrecio = [1.15, 0.85, 1.35, 1]

/** Las 17 ciudades con agencia activa verificadas en el catálogo actual. */
export const ciudadesSalidaEjemplo = [
  'Arequipa', 'Cajamarca', 'Chepén', 'Chiclayo', 'Chimbote', 'Cusco',
  'Huaraz', 'Jaén', 'Lima', 'Máncora', 'Pacasmayo', 'Paita', 'Piura',
  'Sullana', 'Talara', 'Trujillo', 'Tumbes',
]

/** Desglosa las ventas simuladas para que los filtros afecten todas las cifras. */
export function datosDetalleEjemplo(canal: Canal, totales: Totales): VentaDetalle[] {
  return rutasPorCanalEjemplo(canal, totales).flatMap((ruta) => {
    const pasajes = repartir(ruta.pasajes, pesosPasajes)
    const valorServicio = pasajes.map((cantidad, indice) => cantidad * factoresPrecio[indice])
    const sumaValor = valorServicio.reduce((suma, valor) => suma + valor, 0)
    const pesosIngresos = sumaValor === 0 ? pesosPasajes : valorServicio.map((valor) => valor / sumaValor)
    const ingresos = repartir(ruta.ingresos, pesosIngresos)
    const origen = ruta.nombre.split(' → ')[0]

    return servicios.map((servicio, indice) => ({
      ruta: ruta.nombre,
      ciudadSalida: origen,
      servicio,
      pasajes: pasajes[indice],
      ingresos: ingresos[indice],
      viajes: pasajes[indice] === 0 ? 0 : Math.max(1, Math.round(pasajes[indice] / 8)),
    }))
  })
}

export function serviciosGlobalesEjemplo(web: Totales, agencia: Totales): FilaRanking[] {
  const filas = [...datosDetalleEjemplo('web', web), ...datosDetalleEjemplo('agencia', agencia)]
  return ['Semi Cama', 'Estándar', 'Bus Cama', 'Prime'].map((nombre) => ({
    nombre,
    ingresos: filas.filter((fila) => fila.servicio === nombre).reduce((suma, fila) => suma + fila.ingresos, 0),
    pasajes: filas.filter((fila) => fila.servicio === nombre).reduce((suma, fila) => suma + fila.pasajes, 0),
  }))
}
