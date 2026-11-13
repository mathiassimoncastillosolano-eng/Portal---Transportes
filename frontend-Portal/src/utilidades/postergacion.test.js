import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CODIGOS_RECHAZO,
  ESCENARIO_TARIFA,
  adaptarBoletoReal,
  aplicarPostergacion,
  compararTarifas,
  esMismoViaje,
  filtrarViajesPostergables,
  puedeContinuarDesdeTarifa,
  puedeIniciarPostergacion,
  salidaMsDe,
  validarElegibilidad,
  validarViajeNuevo,
} from './postergacion.js'

const AHORA = new Date('2026-11-10T08:00:00').getTime()
const base = {
  idPasaje: 1,
  idCliente: 'u1',
  estado: 'VIGENTE',
  idViaje: 'V1',
  origen: 'Trujillo',
  destino: 'Lima',
  fechaSalida: '2026-11-10',
  horaSalida: '14:00',
}

test('exactamente 6 horas es válido', () => {
  const resultado = validarElegibilidad(base, AHORA, 'u1')
  assert.equal(resultado.elegible, true)
})

test('un minuto menos de 6 horas se rechaza', () => {
  const resultado = validarElegibilidad({ ...base, horaSalida: '13:59' }, AHORA, 'u1')
  assert.equal(resultado.elegible, false)
  assert.equal(resultado.codigo, CODIGOS_RECHAZO.ANTICIPACION_INSUFICIENTE)
})

test('compara fecha y hora completas, no solo fechas', () => {
  const resultado = validarElegibilidad({ ...base, fechaSalida: '2026-11-11', horaSalida: '07:00' }, AHORA, 'u1')
  assert.equal(resultado.elegible, true)
  const mismoDiaTarde = validarElegibilidad({ ...base, fechaSalida: '2026-11-10', horaSalida: '10:00' }, AHORA, 'u1')
  assert.equal(mismoDiaTarde.codigo, CODIGOS_RECHAZO.ANTICIPACION_INSUFICIENTE)
})

test('viajes iniciados o pasados se rechazan', () => {
  assert.equal(validarElegibilidad({ ...base, horaSalida: '08:00' }, AHORA, 'u1').codigo, CODIGOS_RECHAZO.VIAJE_INICIADO)
  assert.equal(validarElegibilidad({ ...base, fechaSalida: '2026-11-09' }, AHORA, 'u1').codigo, CODIGOS_RECHAZO.VIAJE_INICIADO)
})

test('solo pasajes propios y vigentes', () => {
  assert.equal(validarElegibilidad(base, AHORA, 'otro').codigo, CODIGOS_RECHAZO.PASAJE_AJENO)
  for (const estado of ['USADO', 'CANCELADO', 'NO_VALIDO']) {
    assert.equal(validarElegibilidad({ ...base, estado }, AHORA, 'u1').codigo, CODIGOS_RECHAZO.PASAJE_NO_VIGENTE)
  }
  assert.equal(validarElegibilidad(null, AHORA, 'u1').elegible, false)
})

test('comparación tarifaria: igual, superior e inferior', () => {
  const igual = compararTarifas(60, 60)
  assert.equal(igual.escenario, ESCENARIO_TARIFA.IGUAL)
  assert.equal(igual.montoAPagar, 0)
  assert.equal(igual.requierePago, false)
  assert.equal(igual.requiereAceptacion, false)

  const superior = compararTarifas(45, 60.5)
  assert.equal(superior.escenario, ESCENARIO_TARIFA.SUPERIOR)
  assert.equal(superior.diferencia, 15.5)
  assert.equal(superior.montoAPagar, 15.5)
  assert.equal(superior.requierePago, true)

  const inferior = compararTarifas(85, 60)
  assert.equal(inferior.escenario, ESCENARIO_TARIFA.INFERIOR)
  assert.equal(inferior.diferencia, 25)
  assert.equal(inferior.montoAPagar, 0)
  assert.equal(inferior.montoNoDevuelto, 25)
  assert.equal(inferior.requiereAceptacion, true)
})

test('la comparación no sufre errores de coma flotante', () => {
  assert.equal(compararTarifas(0.1 + 0.2, 0.3).escenario, ESCENARIO_TARIFA.IGUAL)
})

test('la aceptación es obligatoria solo cuando la tarifa disminuye', () => {
  const inferior = compararTarifas(85, 60)
  assert.equal(puedeContinuarDesdeTarifa(inferior, false), false)
  assert.equal(puedeContinuarDesdeTarifa(inferior, true), true)
  assert.equal(puedeContinuarDesdeTarifa(compararTarifas(60, 60), false), true)
  assert.equal(puedeContinuarDesdeTarifa(compararTarifas(60, 85), false), true)
  assert.equal(puedeContinuarDesdeTarifa(null, true), false)
})

test('el nuevo viaje no puede ser el original, pasado ni estar lleno', () => {
  const futuro = { id: 'V2', origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-12', horaSalida: '20:00', asientosDisponibles: 5 }
  assert.equal(validarViajeNuevo(base, futuro, AHORA).valido, true)
  assert.equal(validarViajeNuevo(base, { ...futuro, id: 'V1' }, AHORA).codigo, CODIGOS_RECHAZO.MISMO_VIAJE)
  assert.equal(validarViajeNuevo(base, { ...futuro, fechaSalida: '2026-11-09' }, AHORA).codigo, CODIGOS_RECHAZO.VIAJE_NO_FUTURO)
  assert.equal(validarViajeNuevo(base, { ...futuro, asientosDisponibles: 0 }, AHORA).codigo, CODIGOS_RECHAZO.VIAJE_SIN_DISPONIBILIDAD)
  // Regla de 6 h para el viaje nuevo: a las 08:00, una salida a las 13:00 es muy pronto; a las 14:00 ya vale.
  assert.equal(validarViajeNuevo(base, { ...futuro, fechaSalida: '2026-11-10', horaSalida: '13:00' }, AHORA).codigo, CODIGOS_RECHAZO.NUEVO_VIAJE_MUY_PRONTO)
  assert.equal(validarViajeNuevo(base, { ...futuro, fechaSalida: '2026-11-10', horaSalida: '14:00' }, AHORA).valido, true)
  assert.equal(filtrarViajesPostergables(base, [futuro, { ...futuro, id: 'V1' }, { ...futuro, id: 'V3', asientosDisponibles: 0 }], AHORA).length, 1)
})

test('identifica el mismo viaje por datos cuando no hay identificador', () => {
  const sinId = { ...base, idViaje: undefined }
  assert.equal(esMismoViaje(sinId, { id: 'X', origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-10', horaSalida: '14:00' }), true)
  assert.equal(esMismoViaje(sinId, { id: 'X', origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-11', horaSalida: '14:00' }), false)
})

test('aplicar la postergación conserva identidad, venta y pago originales', () => {
  const pasaje = { ...base, idVenta: 77, idPagoOriginal: 'PAG-1', numeroBoleto: 'B-1', asiento: '12', precioPagado: 60 }
  const viaje = { id: 'V9', origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-15', horaSalida: '21:30', horaLlegada: '06:30', empresa: 'Andes Travel', tipoBus: 'Cama' }
  const nuevo = aplicarPostergacion(pasaje, viaje, { numero: '3', piso: 2, idAsiento: 'V9-2-3' }, 25)
  assert.equal(nuevo.idPasaje, pasaje.idPasaje)
  assert.equal(nuevo.idVenta, 77)
  assert.equal(nuevo.idPagoOriginal, 'PAG-1')
  assert.equal(nuevo.idCliente, 'u1')
  assert.equal(nuevo.numeroBoleto, 'B-1')
  assert.equal(nuevo.fechaSalida, '2026-11-15')
  assert.equal(nuevo.asiento, '3')
  assert.equal(nuevo.montoAdicionalPagado, 25)
  assert.equal(pasaje.fechaSalida, '2026-11-10')
})

test('salidaMsDe interpreta HH:mm', () => {
  assert.equal(salidaMsDe('2026-11-10', '14:00'), new Date('2026-11-10T14:00:00').getTime())
  assert.ok(Number.isNaN(salidaMsDe(undefined, '14:00')))
})

test('adapta un boleto real conservando venta, boleto y precio pagado', () => {
  const compra = { idVenta: 5, codigoCompra: 'C-5', estado: 'CONFIRMADA', fase: 'PROXIMO', vigente: true, origen: 'Lima', destino: 'Piura', fechaSalida: '2026-12-01', horaSalida: '20:00', empresa: 'X', tipoBus: 'Cama', moneda: 'PEN' }
  const boleto = { idPasaje: 31, numeroBoleto: 'RL-31', asiento: '8', pasajero: 'Ana', precio: 90 }
  const pasaje = adaptarBoletoReal(compra, boleto, 'u1')
  assert.equal(pasaje.idPasaje, 31)
  assert.equal(pasaje.idVenta, 5)
  assert.equal(pasaje.precioPagado, 90)
  assert.equal(pasaje.estado, 'VIGENTE')
  assert.equal(pasaje.deCompraReal, true)
  assert.equal(puedeIniciarPostergacion(compra), true)
  assert.equal(puedeIniciarPostergacion({ ...compra, fase: 'REALIZADO', vigente: false }), false)
  assert.equal(adaptarBoletoReal({ ...compra, estado: 'REEMBOLSADA' }, boleto, 'u1').estado, 'CANCELADO')
})
