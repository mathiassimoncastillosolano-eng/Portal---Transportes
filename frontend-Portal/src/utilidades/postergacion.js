export const HORAS_MINIMAS_ANTICIPACION = 6
const MS_HORA = 3_600_000

export const ESCENARIO_TARIFA = Object.freeze({
  IGUAL: 'IGUAL',
  SUPERIOR: 'SUPERIOR',
  INFERIOR: 'INFERIOR',
})

export const CODIGOS_RECHAZO = Object.freeze({
  PASAJE_AJENO: 'PASAJE_AJENO',
  PASAJE_NO_VIGENTE: 'PASAJE_NO_VIGENTE',
  VIAJE_INICIADO: 'VIAJE_INICIADO',
  ANTICIPACION_INSUFICIENTE: 'ANTICIPACION_INSUFICIENTE',
  VIAJE_NO_FUTURO: 'VIAJE_NO_FUTURO',
  NUEVO_VIAJE_MUY_PRONTO: 'NUEVO_VIAJE_MUY_PRONTO',
  VIAJE_SIN_DISPONIBILIDAD: 'VIAJE_SIN_DISPONIBILIDAD',
  MISMO_VIAJE: 'MISMO_VIAJE',
  ASIENTO_NO_DISPONIBLE: 'ASIENTO_NO_DISPONIBLE',
})

const MENSAJES_RECHAZO = {
  PASAJE_AJENO: 'Este pasaje no pertenece a tu cuenta, por lo que no puedes cambiarle la fecha.',
  PASAJE_NO_VIGENTE: 'Solo se puede cambiar la fecha de pasajes vigentes. Este pasaje ya fue utilizado, cancelado o no es válido.',
  VIAJE_INICIADO: 'El viaje original ya inició o ya pasó, por lo que no se puede cambiar de fecha.',
  ANTICIPACION_INSUFICIENTE: `El cambio de fecha requiere al menos ${HORAS_MINIMAS_ANTICIPACION} horas de anticipación respecto a la salida original.`,
  VIAJE_NO_FUTURO: 'El nuevo viaje debe ser una salida futura.',
  NUEVO_VIAJE_MUY_PRONTO: `El nuevo viaje debe salir dentro de ${HORAS_MINIMAS_ANTICIPACION} horas o más.`,
  VIAJE_SIN_DISPONIBILIDAD: 'El nuevo viaje no tiene asientos disponibles.',
  MISMO_VIAJE: 'Elige un viaje distinto al original.',
  ASIENTO_NO_DISPONIBLE: 'El asiento que elegiste dejó de estar disponible. Tu pasaje original no fue modificado.',
}

export function mensajeRechazo(codigo) {
  return MENSAJES_RECHAZO[codigo] ?? 'No se pudo completar el cambio de fecha. Tu pasaje original no fue modificado.'
}

export function aCentimos(monto) {
  return Math.round(Number(monto) * 100)
}

export function deCentimos(centimos) {
  return centimos / 100
}

export function salidaMsDe(fecha, hora) {
  if (typeof fecha !== 'string' || typeof hora !== 'string') return Number.NaN
  return new Date(`${fecha}T${hora.length === 5 ? `${hora}:00` : hora}`).getTime()
}

export function horasHastaSalida(salidaMs, ahoraMs) {
  return (salidaMs - ahoraMs) / MS_HORA
}

export function validarElegibilidad(pasaje, ahoraMs, idCliente) {
  const rechazo = (codigo) => ({ elegible: false, codigo, mensaje: mensajeRechazo(codigo) })
  if (!pasaje) return rechazo(CODIGOS_RECHAZO.PASAJE_NO_VIGENTE)
  if (pasaje.idCliente !== idCliente) return rechazo(CODIGOS_RECHAZO.PASAJE_AJENO)
  if (pasaje.estado !== 'VIGENTE') return rechazo(CODIGOS_RECHAZO.PASAJE_NO_VIGENTE)
  const salidaMs = salidaMsDe(pasaje.fechaSalida, pasaje.horaSalida)
  if (!Number.isFinite(salidaMs) || salidaMs <= ahoraMs) return rechazo(CODIGOS_RECHAZO.VIAJE_INICIADO)
  if (salidaMs - ahoraMs < HORAS_MINIMAS_ANTICIPACION * MS_HORA) return rechazo(CODIGOS_RECHAZO.ANTICIPACION_INSUFICIENTE)
  return { elegible: true, codigo: null, mensaje: null }
}

export function esMismoViaje(pasaje, viaje) {
  if (!pasaje || !viaje) return false
  if (pasaje.idViaje && viaje.id) return pasaje.idViaje === viaje.id
  return pasaje.origen === viaje.origen
    && pasaje.destino === viaje.destino
    && pasaje.fechaSalida === viaje.fechaSalida
    && pasaje.horaSalida === viaje.horaSalida
}

export function validarViajeNuevo(pasaje, viaje, ahoraMs) {
  const rechazo = (codigo) => ({ valido: false, codigo, mensaje: mensajeRechazo(codigo) })
  if (esMismoViaje(pasaje, viaje)) return rechazo(CODIGOS_RECHAZO.MISMO_VIAJE)
  const salidaMs = Number.isFinite(viaje?.salidaMs) ? viaje.salidaMs : salidaMsDe(viaje?.fechaSalida, viaje?.horaSalida)
  if (!Number.isFinite(salidaMs) || salidaMs <= ahoraMs) return rechazo(CODIGOS_RECHAZO.VIAJE_NO_FUTURO)
  if (salidaMs - ahoraMs < HORAS_MINIMAS_ANTICIPACION * MS_HORA) return rechazo(CODIGOS_RECHAZO.NUEVO_VIAJE_MUY_PRONTO)
  if (!(viaje.asientosDisponibles > 0)) return rechazo(CODIGOS_RECHAZO.VIAJE_SIN_DISPONIBILIDAD)
  return { valido: true, codigo: null, mensaje: null }
}

export function filtrarViajesPostergables(pasaje, viajes, ahoraMs) {
  return (viajes ?? []).filter((viaje) => validarViajeNuevo(pasaje, viaje, ahoraMs).valido)
}

export function compararTarifas(original, nueva) {
  const centimosOriginal = aCentimos(original)
  const centimosNueva = aCentimos(nueva)
  const delta = centimosNueva - centimosOriginal
  const escenario = delta === 0
    ? ESCENARIO_TARIFA.IGUAL
    : delta > 0 ? ESCENARIO_TARIFA.SUPERIOR : ESCENARIO_TARIFA.INFERIOR
  return {
    escenario,
    original: deCentimos(centimosOriginal),
    nueva: deCentimos(centimosNueva),
    diferencia: deCentimos(Math.abs(delta)),
    montoAPagar: escenario === ESCENARIO_TARIFA.SUPERIOR ? deCentimos(delta) : 0,
    montoNoDevuelto: escenario === ESCENARIO_TARIFA.INFERIOR ? deCentimos(-delta) : 0,
    requierePago: escenario === ESCENARIO_TARIFA.SUPERIOR,
    requiereAceptacion: escenario === ESCENARIO_TARIFA.INFERIOR,
  }
}

export function puedeContinuarDesdeTarifa(comparacion, aceptaCondiciones) {
  if (!comparacion) return false
  return comparacion.requiereAceptacion ? Boolean(aceptaCondiciones) : true
}

export function aplicarPostergacion(pasaje, viaje, asiento, montoAdicional = 0) {
  return {
    ...pasaje,
    idViaje: viaje.id,
    origen: viaje.origen,
    destino: viaje.destino,
    fechaSalida: viaje.fechaSalida,
    horaSalida: viaje.horaSalida,
    horaLlegada: viaje.horaLlegada,
    empresa: viaje.empresa,
    tipoBus: viaje.tipoBus,
    asiento: asiento.numero,
    pisoAsiento: asiento.piso,
    idAsiento: asiento.idAsiento,
    montoAdicionalPagado: montoAdicional,
    postergado: true,
  }
}

function estadoPostergableDeCompra(compra) {
  if (compra?.estado === 'CONFIRMADA' && compra?.fase === 'PROXIMO' && compra?.vigente) return 'VIGENTE'
  if (compra?.estado === 'CONFIRMADA' && compra?.fase === 'REALIZADO') return 'USADO'
  if (compra?.estado === 'REEMBOLSADA' || compra?.fase === 'NO_REALIZADO') return 'CANCELADO'
  return 'NO_VALIDO'
}

export function puedeIniciarPostergacion(compra) {
  return estadoPostergableDeCompra(compra) === 'VIGENTE'
}

export function adaptarBoletoReal(compra, boleto, idCliente) {
  return {
    idPasaje: boleto.idPasaje,
    numeroBoleto: boleto.numeroBoleto,
    idVenta: compra.idVenta,
    codigoCompra: compra.codigoCompra,
    idPagoOriginal: compra.idPago ?? null,
    idCliente,
    estado: estadoPostergableDeCompra(compra),
    pasajero: boleto.pasajero,
    idViaje: compra.idViaje,
    origen: compra.origen,
    destino: compra.destino,
    fechaSalida: compra.fechaSalida,
    horaSalida: compra.horaSalida,
    horaLlegada: compra.horaLlegada,
    empresa: compra.empresa,
    tipoBus: compra.tipoBus,
    asiento: boleto.asiento,
    precioPagado: Number(boleto.precio),
    moneda: compra.moneda ?? 'PEN',
    postergado: false,
    montoAdicionalPagado: 0,
  }
}
