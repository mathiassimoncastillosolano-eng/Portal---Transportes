/**
 * Utilidades de fecha sobre cadenas ISO `YYYY-MM-DD`. Trabajan en UTC para
 * que el resultado no dependa de la zona horaria del navegador.
 */

export function sumarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const fecha = new Date(Date.UTC(y, m - 1, d + dias))
  return fecha.toISOString().slice(0, 10)
}

/** Días entre dos fechas ISO (b - a). */
export function diferenciaDias(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}

/** 0 = domingo … 6 = sábado. */
export function diaSemana(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Lista inclusiva de fechas entre `desde` y `hasta`. */
export function listarDias(desde: string, hasta: string): string[] {
  const total = diferenciaDias(desde, hasta)
  return Array.from({ length: total + 1 }, (_, i) => sumarDias(desde, i))
}
