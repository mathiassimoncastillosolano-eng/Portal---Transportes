const SIN_DATO = '—'

export function formatearPrecio(valor, moneda = 'PEN') {
  const numero = typeof valor === 'number' ? valor : Number(valor)
  if (valor === null || valor === undefined || valor === '' || !Number.isFinite(numero)) return SIN_DATO
  const simbolo = !moneda || moneda === 'PEN' ? 'S/' : moneda
  return `${simbolo} ${numero.toFixed(2)}`
}

function fechaDesdeIso(fechaIso) {
  if (typeof fechaIso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaIso)) return null
  const fecha = new Date(`${fechaIso}T00:00:00`)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

export function formatearFechaLarga(fechaIso) {
  const fecha = fechaDesdeIso(fechaIso)
  if (!fecha) return SIN_DATO
  return fecha.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatearFechaCorta(fechaIso) {
  const fecha = fechaDesdeIso(fechaIso)
  if (!fecha) return SIN_DATO
  return fecha.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// Fecha y hora en que se compró el pasaje, en hora de Perú.
// La base de datos guarda venta.fecha_venta con now() en hora UTC y sin zona
// (por ejemplo "2026-11-12T20:47:36.076041"), así que se lee como UTC.
export function formatearFechaHoraCompra(valor) {
  if (typeof valor !== 'string' || !valor) return SIN_DATO
  const tieneZona = /(Z|[+-]\d{2}:?\d{2})$/.test(valor)
  const fecha = new Date(tieneZona ? valor : `${valor}Z`)
  if (Number.isNaN(fecha.getTime())) return SIN_DATO
  return fecha.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function iniciales(nombres, apellidos) {
  const inicial1 = nombres?.trim()?.[0] ?? ''
  const inicial2 = apellidos?.trim()?.[0] ?? ''
  return `${inicial1}${inicial2}`.toUpperCase()
}
