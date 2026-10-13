/**
 * Presentación de las compras que entrega el backend. Aquí NO se decide nada de negocio (vigencia, estado,
 * viaje realizado, totales): eso lo calcula el servidor con la hora de Perú y llega ya resuelto en cada
 * compra (`estado`, `fase`, `vigente`, `documentoDisponible`, `total`...). Estas funciones solo eligen
 * etiquetas, agrupan y filtran para la interfaz.
 */

/**
 * Etiqueta única que combina el estado del pago y el del viaje, sin confundirlos:
 * primero manda el estado de la compra; si está confirmada, describe el viaje.
 * `clave` es una de las de EstadoDisponibilidad.
 */
export function estadoVisible(compra) {
  switch (compra?.estado) {
    case 'REEMBOLSADA':
      return { clave: 'REEMBOLSADO', etiqueta: 'Reembolsado' }
    case 'SIN_CONFIRMAR':
      return { clave: 'PAGO_SIN_CONFIRMAR', etiqueta: 'Pago sin confirmar' }
    case 'CONFIRMADA':
      break
    default:
      return { clave: 'SIN_INFORMACION', etiqueta: 'Sin información' }
  }
  switch (compra.fase) {
    case 'PROXIMO':
      return { clave: 'confirmado', etiqueta: 'Confirmado' }
    case 'REALIZADO':
      return { clave: 'completado', etiqueta: 'Viaje realizado' }
    case 'NO_REALIZADO':
      return compra.estadoViaje === 'CANCELADO'
        ? { clave: 'cancelado', etiqueta: 'Viaje cancelado' }
        : { clave: 'cancelado', etiqueta: 'Viaje no realizado' }
    default:
      return { clave: 'SIN_INFORMACION', etiqueta: 'Sin información' }
  }
}

/** Separa las compras vigentes de las anteriores respetando el orden que ya trae el backend. */
export function agruparPasajes(compras) {
  const vigentes = []
  const anteriores = []
  for (const compra of compras ?? []) (compra.vigente ? vigentes : anteriores).push(compra)
  return { vigentes, anteriores }
}

export const FILTROS_HISTORIAL = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'realizados', etiqueta: 'Realizados' },
  { id: 'cancelados', etiqueta: 'Cancelados' },
  { id: 'otros', etiqueta: 'Otros' },
]

function pertenece(compra, filtro) {
  const realizado = compra.estado === 'CONFIRMADA' && compra.fase === 'REALIZADO'
  const cancelado = compra.estado === 'CONFIRMADA' && compra.fase === 'NO_REALIZADO'
  switch (filtro) {
    case 'realizados':
      return realizado
    case 'cancelados':
      return cancelado
    case 'otros':
      return !realizado && !cancelado
    default:
      return true
  }
}

export function filtrarHistorial(compras, filtro = 'todos') {
  return (compras ?? []).filter((compra) => pertenece(compra, filtro))
}

export function contarPorFiltro(compras) {
  return Object.fromEntries(FILTROS_HISTORIAL.map(({ id }) => [id, filtrarHistorial(compras, id).length]))
}

export function textoAsientos(compra) {
  const asientos = (compra?.boletos ?? []).map((boleto) => boleto.asiento).filter(Boolean)
  return asientos.length > 0 ? asientos.join(', ') : null
}

/** Mensajes para una compra marcada `incompleta` por el backend: qué dato falta, sin inventarlo. */
export function datosFaltantes(compra) {
  const faltan = []
  if (!compra?.origen || !compra?.destino) faltan.push('el trayecto')
  if (!compra?.fechaSalida || !compra?.horaSalida) faltan.push('la fecha u hora de salida')
  if (!compra?.tipoBus) faltan.push('el tipo de servicio')
  if (!compra?.boletos || compra.boletos.length === 0) faltan.push('los boletos')
  else if (compra.boletos.some((b) => !b.asiento || !b.pasajero)) faltan.push('el asiento o el pasajero de algún boleto')
  return faltan
}

/** Texto cuando el total de la venta no coincide con la suma de sus boletos (se muestra, no se oculta). */
export function avisoTotal(compra) {
  return compra && compra.totalConsistente === false && compra.boletos?.length > 0
    ? 'El importe total de la compra no coincide con la suma de sus boletos. Contáctanos si necesitas aclararlo.'
    : null
}
