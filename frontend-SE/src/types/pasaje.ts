import type { Agencia } from './agency'
import type { MetodoPagoId, DatosPago } from './pago'
import type { DatosPasajero, Pasajero } from './pasajero'
import type { Servicio, ServicioId } from './servicio'
import type { Viaje } from './viaje'

/** Máximo de asientos/pasajeros que se pueden registrar en una sola operación. */
export const MAX_ASIENTOS_OPERACION = 6

/** Solo `emitido` es alcanzable desde la UI; `anulado` existe para que el Dashboard aplique su regla de exclusión. */
export type EstadoPasaje = 'emitido' | 'anulado'

/**
 * Un `Pasaje` es siempre la unidad mínima: un asiento + un pasajero. Una
 * operación de venta con varios asientos genera varios `Pasaje`, uno por
 * asiento — así el Dashboard (que agrega sumando `pasajes`) no necesita
 * saber nada de "operaciones" para seguir calculando bien ingresos,
 * ocupación y rankings.
 *
 * `operacionId` solo agrupa, para trazabilidad, los pasajes que se
 * registraron y pagaron juntos en una misma operación de ventanilla.
 */
export interface Pasaje {
  id: string
  /** RL-PS-000123 */
  codigo: string
  /** RL-OP-000123 — agrupa los pasajes emitidos en la misma operación (mismo pago). */
  operacionId: string
  viajeId: string
  pasajeroId: string
  asiento: number
  servicioId: ServicioId
  precio: number
  metodoPagoId: MetodoPagoId
  referenciaPago?: string
  /** Monto recibido y vuelto de la OPERACIÓN completa (el pago es único para todos los pasajes del grupo). */
  montoRecibido?: number
  vuelto?: number
  /** YYYY-MM-DDTHH:mm:ss */
  fechaEmision: string
  estado: EstadoPasaje
  agenciaVentaId: string
}

/** Un asiento + los datos de su pasajero, tal como los captura el paso "Pasajeros". */
export interface ItemOperacionInput {
  asiento: number
  pasajero: DatosPasajero
}

/**
 * Entrada para registrar una operación completa: de 1 a 6 asientos del
 * mismo viaje, cada uno con su pasajero, pagados en un único pago.
 */
export interface RegistrarOperacionInput {
  viajeId: string
  items: ItemOperacionInput[]
  pago: DatosPago
  agenciaVentaId: string
}

/** Vista completa de un pasaje recién emitido, lista para su boleto individual en pantalla. */
export interface ComprobantePasaje {
  pasaje: Pasaje
  pasajero: Pasajero
  viaje: Viaje
  servicio: Servicio
  agenciaVenta: Agencia
  agenciaViaje: Agencia
  /** Código de asiento amigable (ej. "3D"), no el número interno. */
  codigoAsiento: string
}

/** Resultado de registrar una operación: un boleto por cada asiento/pasajero. */
export interface ComprobanteOperacion {
  operacionId: string
  boletos: ComprobantePasaje[]
  cantidadPasajes: number
  totalPagado: number
}

export interface EstadoAsientosViaje {
  viaje: Viaje
  servicio: Servicio
  /** Números de asiento ocupados (pasajes emitidos + registrados en la sesión). */
  ocupados: number[]
}
