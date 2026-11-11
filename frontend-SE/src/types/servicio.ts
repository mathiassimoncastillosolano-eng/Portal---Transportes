export type ServicioId = 'economico' | 'ejecutivo' | 'vip' | 'directo'

export type TipoUnidad = 'bus-1-piso' | 'bus-2-pisos' | 'bus-vip'

/**
 * Un piso del bus: `filas` filas con un pasillo central. `patron` indica
 * cuántos asientos hay a cada lado del pasillo (ej. [2, 2] o [1, 2] en VIP).
 */
export interface PisoBus {
  piso: number
  filas: number
  patron: [number, number]
}

export interface DistribucionAsientos {
  pisos: PisoBus[]
}

export interface Servicio {
  id: ServicioId
  nombre: string
  tipoUnidad: TipoUnidad
  /** Etiqueta legible de la unidad, ej. "Bus 2 pisos". */
  unidad: string
  distribucion: DistribucionAsientos
  /** Tarifa de referencia (ruta de factor 1.00) en soles. */
  tarifaBase: number
}
