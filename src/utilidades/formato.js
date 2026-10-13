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

export function iniciales(nombres, apellidos) {
  const inicial1 = nombres?.trim()?.[0] ?? ''
  const inicial2 = apellidos?.trim()?.[0] ?? ''
  return `${inicial1}${inicial2}`.toUpperCase()
}
