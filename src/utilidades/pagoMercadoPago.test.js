import test from 'node:test'
import assert from 'node:assert/strict'
import {
  construirSolicitudPagoTarjeta,
  construirSolicitudPagoYape,
  describirEstadoPago,
  tipoDePagoTarjeta,
  validarPagoYape,
} from './pagoMercadoPago.js'

// Forma de getFormData() del Card Payment Brick de Mercado Pago.
const datosTarjeta = {
  token: 'tok_un_solo_uso',
  issuer_id: '1',
  payment_method_id: 'visa',
  transaction_amount: 1, // aunque el Brick lo informe, NO se envía al backend
  installments: 3,
  payer: { email: ' comprador@example.com ', identification: { type: 'DNI', number: '12345678' } },
}

test('la solicitud de tarjeta no lleva importe ni datos de la tarjeta, solo el token', () => {
  const s = construirSolicitudPagoTarjeta({ idViaje: 7, tokenSesion: 'ses', claveIdempotencia: 'clave-1234567890ab', datosTarjeta })
  assert.deepEqual(s, {
    idViaje: 7,
    tokenSesion: 'ses',
    claveIdempotencia: 'clave-1234567890ab',
    medioPago: 'TARJETA',
    token: 'tok_un_solo_uso',
    metodoPagoId: 'visa',
    tipoPago: 'credit_card',
    cuotas: 3,
    emailPagador: 'comprador@example.com',
    tipoDocumento: 'DNI',
    numeroDocumento: '12345678',
  })
  for (const prohibido of ['monto', 'transaction_amount', 'cardNumber', 'securityCode', 'numeroTarjeta', 'cvv']) {
    assert.equal(prohibido in s, false, prohibido)
  }
})

test('tipo de tarjeta: usa el informado por el Brick y reconoce débito por id', () => {
  assert.equal(tipoDePagoTarjeta('visa', { paymentTypeId: 'debit_card' }), 'debit_card')
  assert.equal(tipoDePagoTarjeta('debmaster', null), 'debit_card')
  assert.equal(tipoDePagoTarjeta('master', {}), 'credit_card')
  assert.equal(tipoDePagoTarjeta('master', { paymentTypeId: 'ticket' }), 'credit_card')
})

test('la solicitud de Yape no lleva el código de aprobación ni el importe', () => {
  const s = construirSolicitudPagoYape({
    idViaje: 7,
    tokenSesion: 'ses',
    claveIdempotencia: 'clave-abcdefabcdef',
    token: 'tok_yape',
    valores: { celular: '987654321', codigoAprobacion: '123456', correo: 'a@b.com ' },
  })
  assert.equal(s.medioPago, 'YAPE')
  assert.equal(s.token, 'tok_yape')
  assert.equal(s.celular, '987654321')
  assert.equal(s.emailPagador, 'a@b.com')
  assert.equal(JSON.stringify(s).includes('123456'), false)
  assert.equal('monto' in s, false)
})

test('valida celular y código de Yape; los celulares de prueba solo en Sandbox', () => {
  const base = { celular: '987654321', codigoAprobacion: '123456', correo: 'a@b.com' }
  assert.deepEqual(validarPagoYape(base), {})
  assert.ok(validarPagoYape({ ...base, celular: '87654321' }).celular)
  assert.ok(validarPagoYape({ ...base, codigoAprobacion: '12345' }).codigoAprobacion)
  assert.ok(validarPagoYape({ ...base, correo: 'sin-arroba' }).correo)
  assert.ok(validarPagoYape({ ...base, celular: '111111111' }).celular)
  assert.deepEqual(validarPagoYape({ ...base, celular: '111111111' }, { sandbox: true }), {})
})

test('solo APROBADO del backend se muestra como pago aprobado', () => {
  assert.equal(describirEstadoPago({ estado: 'APROBADO' }).fase, 'aprobado')
  for (const estado of ['CREANDO', 'EN_PROCESO']) {
    assert.equal(describirEstadoPago({ estado }).fase, 'procesando')
    assert.equal(describirEstadoPago({ estado }, { agotado: true }).fase, 'pendiente')
  }
  assert.equal(describirEstadoPago({ estado: 'ACCION_REQUERIDA' }).fase, 'accion')
  for (const estado of ['RECHAZADO', 'ERROR', 'EXPIRADO']) {
    assert.equal(describirEstadoPago({ estado }).fase, 'rechazado')
  }
  for (const estado of ['APROBADO_SIN_ASIENTOS', 'REEMBOLSADO']) {
    assert.equal(describirEstadoPago({ estado }).fase, 'reembolso')
  }
  // Un estado desconocido o una respuesta vacía nunca se interpreta como aprobado.
  assert.equal(describirEstadoPago({ estado: 'approved' }).fase, 'procesando')
  assert.equal(describirEstadoPago(null).fase, 'procesando')
})
