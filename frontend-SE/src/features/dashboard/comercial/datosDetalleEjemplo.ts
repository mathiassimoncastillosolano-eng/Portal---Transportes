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

/**
 * Rutas regionales de las ciudades que no son origen de las 10 rutas principales.
 * Se llevan una parte pequeña de las ventas para que las 17 ciudades aparezcan como origen y destino.
 */
const rutasRegionales: { origen: string; destino: string; peso: number }[] = [
  { origen: 'Chimbote', destino: 'Lima', peso: 0.026 },
  { origen: 'Cajamarca', destino: 'Trujillo', peso: 0.024 },
  { origen: 'Arequipa', destino: 'Lima', peso: 0.022 },
  { origen: 'Cusco', destino: 'Lima', peso: 0.02 },
  { origen: 'Sullana', destino: 'Piura', peso: 0.016 },
  { origen: 'Huaraz', destino: 'Lima', peso: 0.015 },
  { origen: 'Tumbes', destino: 'Piura', peso: 0.014 },
  { origen: 'Jaén', destino: 'Chiclayo', peso: 0.012 },
  { origen: 'Chepén', destino: 'Trujillo', peso: 0.011 },
  { origen: 'Talara', destino: 'Piura', peso: 0.01 },
  { origen: 'Paita', destino: 'Piura', peso: 0.008 },
]

function desglosar(nombre: string, origen: string, pasajesRuta: number, ingresosRuta: number): VentaDetalle[] {
  const pasajes = repartir(pasajesRuta, pesosPasajes)
  const valorServicio = pasajes.map((cantidad, indice) => cantidad * factoresPrecio[indice])
  const sumaValor = valorServicio.reduce((suma, valor) => suma + valor, 0)
  const pesosIngresos = sumaValor === 0 ? pesosPasajes : valorServicio.map((valor) => valor / sumaValor)
  const ingresos = repartir(ingresosRuta, pesosIngresos)
  return servicios.map((servicio, indice) => ({
    ruta: nombre,
    ciudadSalida: origen,
    servicio,
    pasajes: pasajes[indice],
    ingresos: ingresos[indice],
    viajes: pasajes[indice] === 0 ? 0 : Math.max(1, Math.round(pasajes[indice] / 8)),
  }))
}

/** Desglosa las ventas simuladas para que los filtros afecten todas las cifras. */
export function datosDetalleEjemplo(canal: Canal, totales: Totales): VentaDetalle[] {
  const pesoRegional = rutasRegionales.reduce((suma, ruta) => suma + ruta.peso, 0)
  const pesos = [1 - pesoRegional, ...rutasRegionales.map((ruta) => ruta.peso)]
  const pasajes = repartir(totales.pasajes, pesos)
  const ingresos = repartir(totales.ingresos, pesos)
  const principales: Totales = { pasajes: pasajes[0], ingresos: ingresos[0], compras: totales.compras }

  const filasPrincipales = rutasPorCanalEjemplo(canal, principales).flatMap((ruta) =>
    desglosar(ruta.nombre, ruta.nombre.split(' → ')[0], ruta.pasajes, ruta.ingresos))
  // Cada ruta regional tiene ida y vuelta, así las 17 ciudades son origen y también destino.
  const filasRegionales = rutasRegionales.flatMap((ruta, indice) => {
    const pasajesIda = Math.ceil(pasajes[indice + 1] * 0.55)
    const ingresosIda = Math.ceil(ingresos[indice + 1] * 0.55)
    return [
      ...desglosar(`${ruta.origen} → ${ruta.destino}`, ruta.origen, pasajesIda, ingresosIda),
      ...desglosar(`${ruta.destino} → ${ruta.origen}`, ruta.destino, pasajes[indice + 1] - pasajesIda, ingresos[indice + 1] - ingresosIda),
    ]
  })
  return [...filasPrincipales, ...filasRegionales]
}

export function serviciosGlobalesEjemplo(web: Totales, agencia: Totales): FilaRanking[] {
  const filas = [...datosDetalleEjemplo('web', web), ...datosDetalleEjemplo('agencia', agencia)]
  return ['Semi Cama', 'Estándar', 'Bus Cama', 'Prime'].map((nombre) => ({
    nombre,
    ingresos: filas.filter((fila) => fila.servicio === nombre).reduce((suma, fila) => suma + fila.ingresos, 0),
    pasajes: filas.filter((fila) => fila.servicio === nombre).reduce((suma, fila) => suma + fila.pasajes, 0),
  }))
}
