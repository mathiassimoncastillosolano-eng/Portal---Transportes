import test from 'node:test'
import assert from 'node:assert/strict'
import {
  VALORES_TARJETA_INICIALES,
  construirSolicitudPago,
  detectarMarca,
  formatearNumeroTarjeta,
  pasaLuhn,
  simularRespuestaPago,
  validarPagoTarjeta,
  validarPagoYape,
} from './pagoMercadoPago.js'

const HOY = new Date('2026-10-04T12:00:00')

// Tarjeta de prueba Visa publicada por Mercado Pago Perú.
const tarjeta = {
  ...VALORES_TARJETA_INICIALES,
  numeroTarjeta: '4009 1753 3280 6176',
  titular: 'APRO',
  vencimiento: '11/30',
  cvv: '123',
  tipoDocumento: 'DNI',
  numeroDocumento: '12345678',
  correo: 'lucas@example.com',
  cuotas: 3,
}

test('detecta la marca por BIN y formatea según la marca', () => {
  assert.equal(detectarMarca('4009')?.id, 'visa')
  assert.equal(detectarMarca('5031 7557')?.id, 'master')
  assert.equal(detectarMarca('2221 00')?.id, 'master')
  assert.equal(detectarMarca('3711')?.id, 'amex')
  assert.equal(detectarMarca('3056')?.id, 'diners')
  assert.equal(detectarMarca('6011'), null)
  assert.equal(formatearNumeroTarjeta('371180303257522'), '3711 803032 57522')
  assert.equal(formatearNumeroTarjeta('40091753328061769999'), '4009 1753 3280 6176')
})

test('valida Luhn con las tarjetas de prueba', () => {
  assert.ok(pasaLuhn('4009175332806176'))
  assert.ok(pasaLuhn('5031755734530604'))
  assert.ok(pasaLuhn('371180303257522'))
  assert.equal(pasaLuhn('4009175332806177'), false)
})

test('acepta una tarjeta de prueba completa', () => {
  assert.deepEqual(validarPagoTarjeta(tarjeta, HOY), {})
})

test('exige CVV de 4 dígitos para American Express', () => {
  const amex = { ...tarjeta, numeroTarjeta: '3711 803032 57522', cvv: '123' }
  assert.ok(validarPagoTarjeta(amex, HOY).cvv)
  assert.deepEqual(validarPagoTarjeta({ ...amex, cvv: '1234' }, HOY), {})
})

test('rechaza tarjeta vencida, documento mal formado y correo inválido', () => {
  const errores = validarPagoTarjeta(
    { ...tarjeta, vencimiento: '09/26', numeroDocumento: '1234', correo: 'sin-arroba' },
    HOY,
  )
  assert.ok(errores.vencimiento)
  assert.ok(errores.numeroDocumento)
  assert.ok(errores.correo)
  assert.equal(validarPagoTarjeta({ ...tarjeta, vencimiento: '10/26' }, HOY).vencimiento, undefined)
})

test('valida el documento según su tipo', () => {
  assert.ok(validarPagoTarjeta({ ...tarjeta, tipoDocumento: 'RUC', numeroDocumento: '12345678' }, HOY).numeroDocumento)
  assert.equal(
    validarPagoTarjeta({ ...tarjeta, tipoDocumento: 'RUC', numeroDocumento: '20123456789' }, HOY).numeroDocumento,
    undefined,
  )
  assert.equal(
    validarPagoTarjeta({ ...tarjeta, tipoDocumento: 'Otro', numeroDocumento: '123456789' }, HOY).numeroDocumento,
    undefined,
  )
})

test('valida celular y código de aprobación de Yape', () => {
  assert.deepEqual(validarPagoYape({ celular: '987654321', codigoAprobacion: '123456', correo: 'a@b.pe' }), {})
  const errores = validarPagoYape({ celular: '12345', codigoAprobacion: '12', correo: '' })
  assert.ok(errores.celular)
  assert.ok(errores.codigoAprobacion)
  assert.ok(errores.correo)
})

test('arma la solicitud de tarjeta sin datos sensibles', () => {
  const solicitud = construirSolicitudPago({
    metodo: 'tarjeta',
    valores: tarjeta,
    token: 'tok_demo',
    monto: 120.5,
    descripcion: 'Pasaje Lima - Cusco',
    referencia: 'RL-1',
  })
  assert.deepEqual(solicitud, {
    token: 'tok_demo',
    transaction_amount: 120.5,
    description: 'Pasaje Lima - Cusco',
    external_reference: 'RL-1',
    payment_method_id: 'visa',
    issuer_id: null,
    installments: 3,
    payer: { email: 'lucas@example.com', identification: { type: 'DNI', number: '12345678' } },
  })
  const texto = JSON.stringify(solicitud)
  assert.equal(texto.includes('4009'), false)
  assert.equal(texto.includes('"123"'), false)
})

test('arma la solicitud de Yape con una sola cuota', () => {
  const solicitud = construirSolicitudPago({
    metodo: 'yape',
    valores: { celular: '987654321', codigoAprobacion: '123456', correo: 'a@b.pe' },
    token: 'tok_yape',
    monto: 80,
    descripcion: 'Pasaje',
    referencia: 'RL-2',
  })
  assert.equal(solicitud.payment_method_id, 'yape')
  assert.equal(solicitud.installments, 1)
  assert.deepEqual(solicitud.payer, { email: 'a@b.pe' })
})

test('simula las respuestas del sandbox según el titular', () => {
  assert.equal(simularRespuestaPago('tarjeta', tarjeta).status, 'approved')
  assert.equal(simularRespuestaPago('tarjeta', { ...tarjeta, titular: 'fund' }).status_detail, 'cc_rejected_insufficient_amount')
  assert.equal(simularRespuestaPago('tarjeta', { ...tarjeta, titular: 'CONT' }).status, 'in_process')
})
