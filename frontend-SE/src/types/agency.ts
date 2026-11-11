/**
 * Modelos base para la jerarquía multi-tenant:
 *   Tenant -> Agencia de Transportes -> Terminal/Sede -> Usuario -> Módulos
 *
 * En el MVP cada sede (`Branch`) ES una agencia: el selector del Header, la
 * sede de venta del pasaje y la agrupación del Dashboard usan la misma entidad.
 */

export type EstadoAgencia = 'activa' | 'inactiva'

export interface Agencia {
  id: string
  name: string
  /** Ubicación legible, ej. "Lima, Perú". */
  location: string
  /** Ciudad sin país; coincide con las ciudades de origen/destino de los viajes. */
  city: string
  /** Código corto mostrado en el selector, ej. "LIM", "CUZ". */
  code: string
  status: EstadoAgencia
}

/** Alias histórico del selector de sede: una sede es una agencia. */
export type Branch = Agencia
