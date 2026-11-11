const moneda = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  currencyDisplay: 'narrowSymbol',
})
const monedaEntera = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
})
const numero = new Intl.NumberFormat('es-PE')

/** S/ 1,234.50 (es-PE). */
export function formatearMoneda(valor: number): string {
  return moneda.format(valor)
}

/** S/ 1,235 — sin decimales, para KPIs y ejes de gráficos. */
export function formatearMonedaEntera(valor: number): string {
  return monedaEntera.format(valor)
}

export function formatearNumero(valor: number): string {
  return numero.format(valor)
}

export function formatearPorcentaje(valor: number, decimales = 1): string {
  return `${valor.toLocaleString('es-PE', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}%`
}

function aFechaUtc(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** 24 sep 2026 */
export function formatearFecha(iso: string): string {
  return aFechaUtc(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** jue 24 sep */
export function formatearFechaCorta(iso: string): string {
  return aFechaUtc(iso).toLocaleDateString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
}

/** 24 sep */
export function formatearDiaMes(iso: string): string {
  return aFechaUtc(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}

/** Fecha y hora de una emisión `YYYY-MM-DDTHH:mm:ss`. */
export function formatearFechaHora(isoDateTime: string): string {
  return `${formatearFecha(isoDateTime)} · ${isoDateTime.slice(11, 16)} h`
}

/** Jue, 24 Sep 2026 — para controles de fecha (mayúscula inicial vía CSS `capitalize`). */
export function formatearFechaLarga(iso: string): string {
  return aFechaUtc(iso).toLocaleDateString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
