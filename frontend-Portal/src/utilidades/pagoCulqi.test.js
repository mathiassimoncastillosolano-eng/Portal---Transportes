import test from 'node:test'
import assert from 'node:assert/strict'
import { construirSolicitudPago, describirEstadoPago, tipoMedioPago } from './pagoCulqi.js'

test('el medio de pago se deduce del prefijo del token de Culqi', () => {
  assert.equal(tipoMedioPago('tkn_test_abc'), 'TARJETA')
  assert.equal(tipoMedioPago('ype_test_abc'), 'YAPE')
})

test('la solicitud nunca lleva importe y siempre declara la aceptación de términos', () => {
  const s = construirSolicitudPago({
    idViaje: 7,
    tokenSesion: 'ts',
    claveIdempotencia: 'clave-1234567890ab',
    token: { id: 'tkn_test_abc', email: '' },
    correo: ' cliente@example.com ',
  })
  assert.equal(s.emailPagador, 'cliente@example.com')
  assert.equal(s.aceptaTerminos, true)
  assert.equal(s.medioPago, 'TARJETA')
  assert.ok(!('monto' in s))
})

test('el correo del token tiene prioridad sobre el de la cuenta', () => {
  const s = construirSolicitudPago({
    idViaje: 1,
    tokenSesion: 't',
    claveIdempotencia: 'c',
    token: { id: 'ype_test_x', email: 'otro@example.com' },
    correo: 'cuenta@example.com',
  })
  assert.equal(s.emailPagador, 'otro@example.com')
  assert.equal(s.medioPago, 'YAPE')
})

test('describirEstadoPago mapea los estados del backend', () => {
  assert.equal(describirEstadoPago({ estado: 'APROBADO' }).fase, 'aprobado')
  assert.equal(describirEstadoPago({ estado: 'RECHAZADO' }).fase, 'rechazado')
  assert.equal(describirEstadoPago({ estado: 'ACCION_REQUERIDA' }).fase, 'accion')
  assert.equal(describirEstadoPago({ estado: 'REEMBOLSADO' }).fase, 'reembolso')
  assert.equal(describirEstadoPago({ estado: 'EN_PROCESO' }, { agotado: true }).fase, 'pendiente')
  assert.equal(describirEstadoPago({ estado: 'EN_PROCESO' }).fase, 'procesando')
})
