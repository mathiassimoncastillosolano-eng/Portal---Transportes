export type MetodoPagoId = 'efectivo' | 'tarjeta' | 'yape-plin' | 'transferencia'

export interface MetodoPago {
  id: MetodoPagoId
  nombre: string
  requiereReferencia: boolean
  /** Etiqueta del campo de referencia, ej. "Código de operación". */
  etiquetaReferencia?: string
}

/** Datos que captura el formulario del paso "Pago". */
export interface DatosPago {
  metodoPagoId: MetodoPagoId
  /** Monto aplicado al pasaje. Debe coincidir con el total. */
  monto: number
  /** Solo efectivo: monto entregado por el cliente. */
  montoRecibido?: number
  /** Solo pagos con referencia. */
  referencia?: string
}
