export function formatearPrecio(valor) {
  return `S/ ${valor.toFixed(2)}`
}

export function formatearFechaLarga(fechaIso) {
  const fecha = new Date(`${fechaIso}T00:00:00`)
  return fecha.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatearFechaCorta(fechaIso) {
  const fecha = new Date(`${fechaIso}T00:00:00`)
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
