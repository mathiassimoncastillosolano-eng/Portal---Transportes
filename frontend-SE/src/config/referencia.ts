/**
 * Fecha de referencia del sistema ("hoy" del MVP).
 *
 * Los datos mock son deterministas y se generan respecto a esta fecha, así
 * que la app no depende del reloj real: los mismos datos, en cada recarga.
 * Con una API real este valor se reemplaza por la fecha del servidor
 * (por ejemplo `new Date().toISOString().slice(0, 10)`).
 */
export const FECHA_REFERENCIA = '2026-09-24'

/** Días de historia disponibles hacia atrás (incluye la fecha de referencia). */
export const DIAS_HISTORIA = 180
