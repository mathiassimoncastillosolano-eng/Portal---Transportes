export function formatearPrecio(valor) {
  // Los viajes reales (backend) todavía no tienen una fuente de precio en
  // la BD (ver informe de la FASE 1): en vez de inventar un número, se
  // muestra un texto neutro sin tocar el diseño de la tarjeta.
  if (typeof valor !== 'number') return 'Consultar precio'
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
