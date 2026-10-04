/**
 * Construye la salida en hora local a partir del formato que usa el frontend.
 * Los datos incompletos no se muestran como pasajes vigentes.
 */
export function salidaDePasaje(pasaje) {
  const fecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pasaje?.fecha ?? '')
  const hora = /^(\d{2}):(\d{2})$/.exec(pasaje?.hora ?? '')
  if (!fecha || !hora) return null

  const [, anio, mes, dia] = fecha.map(Number)
  const [, horas, minutos] = hora.map(Number)
  const salida = new Date(anio, mes - 1, dia, horas, minutos)
  if (salida.getFullYear() !== anio || salida.getMonth() !== mes - 1 ||
      salida.getDate() !== dia || salida.getHours() !== horas || salida.getMinutes() !== minutos) {
    return null
  }
  return salida
}

export function pasajesVigentes(pasajes, ahora = new Date()) {
  return pasajes
    .filter((pasaje) => pasaje.estado === 'confirmado' && (salidaDePasaje(pasaje)?.getTime() ?? 0) > ahora.getTime())
    .sort((a, b) => salidaDePasaje(a) - salidaDePasaje(b))
}

/** Una compra puede contener varios asientos del mismo viaje. */
export function comprasVigentes(boletos, ahora = new Date()) {
  const grupos = new Map()
  for (const boleto of pasajesVigentes(boletos, ahora)) {
    const id = boleto.compraId || boleto.codigo
    if (!id) continue
    if (!grupos.has(id)) grupos.set(id, {
      id, estado: boleto.estado, origen: boleto.origen, destino: boleto.destino,
      fecha: boleto.fecha, hora: boleto.hora, empresa: boleto.empresa,
      tipoBus: boleto.tipoBus, boletos: [], total: 0,
    })
    const compra = grupos.get(id)
    compra.boletos.push({ codigo: boleto.codigo, asiento: boleto.asiento, precio: boleto.precio })
    compra.total += Number(boleto.precio) || 0
  }
  return [...grupos.values()]
}

export function nombreDelPasajero(pasaje) {
  if (typeof pasaje.pasajero === 'string') return pasaje.pasajero.trim()
  const datos = pasaje.pasajero ?? pasaje.datosPasajero
  return [datos?.nombres, datos?.apellidos].filter(Boolean).join(' ').trim()
}
