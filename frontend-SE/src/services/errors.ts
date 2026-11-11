export type ServiceErrorCode =
  | 'ASIENTO_OCUPADO'
  | 'VIAJE_NO_VENDIBLE'
  | 'NO_ENCONTRADO'
  | 'VALIDACION'
  | 'DESCONOCIDO'

/** Error de dominio que la UI puede distinguir por `code` (una API real debe mapear sus errores a esto). */
export class ServiceError extends Error {
  readonly code: ServiceErrorCode
  /** Datos estructurados opcionales del error, ej. `{ asiento: 13 }` en `ASIENTO_OCUPADO`. */
  readonly details?: Record<string, unknown>

  constructor(code: ServiceErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.details = details
  }
}

export function esServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError
}
