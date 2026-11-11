import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ESTADO_INICIAL, PASOS, erroresContrasenaNueva, evaluarContrasenaNueva, normalizarCodigo,
  ocultarCorreo, reducirRecuperacion, validarCorreoRecuperacion,
} from './recuperacionContrasena.js'

test('valida el formato del correo', () => {
  assert.equal(validarCorreoRecuperacion('ana@example.com'), '')
  assert.match(validarCorreoRecuperacion(''), /Ingresa tu correo/)
  assert.match(validarCorreoRecuperacion('ana@'), /válido/)
  assert.match(validarCorreoRecuperacion('a b@c.com'), /válido/)
})

test('oculta parcialmente el correo', () => {
  assert.equal(ocultarCorreo('maxty@gmail.com'), 'm***y@gmail.com')
  assert.equal(ocultarCorreo('ab@x.pe'), 'a***@x.pe')
  assert.equal(ocultarCorreo('sin-arroba'), 'sin-arroba')
})

test('el código solo admite dígitos y 6 posiciones, también al pegar', () => {
  assert.equal(normalizarCodigo('12a3-45 6789'), '123456')
  assert.equal(normalizarCodigo(' 048 213 '), '048213')
  assert.equal(normalizarCodigo(null), '')
})

test('los requisitos de contraseña se actualizan mientras se escribe', () => {
  assert.equal(evaluarContrasenaNueva('abc', '').valida, false)
  const r = evaluarContrasenaNueva('abcdefgh', 'abcdefgh')
  assert.equal(r.valida, true)
  assert.deepEqual(r.requisitos.map((x) => x.cumple), [true, true, true])
  assert.equal(evaluarContrasenaNueva('abcdefgh', 'abcdefgX').requisitos[2].cumple, false)
  assert.equal(evaluarContrasenaNueva('é'.repeat(37), 'é'.repeat(37)).requisitos[1].cumple, false) // 74 bytes
})

test('errores por campo siguen la política del registro', () => {
  assert.deepEqual(erroresContrasenaNueva('abcdefgh', 'abcdefgh'), {})
  assert.match(erroresContrasenaNueva('', '').contrasena, /Ingresa/)
  assert.match(erroresContrasenaNueva('corta', 'corta').contrasena, /al menos 8/)
  assert.match(erroresContrasenaNueva('abcdefgh', 'otra').confirmacion, /no coinciden/)
})

test('el flujo avanza en orden y no se puede saltar pasos', () => {
  let e = ESTADO_INICIAL
  assert.equal(reducirRecuperacion(e, { tipo: 'CODIGO_VERIFICADO', prueba: 'x' }).paso, PASOS.METODO)
  assert.equal(reducirRecuperacion(e, { tipo: 'CONTRASENA_CAMBIADA' }).paso, PASOS.METODO)
  e = reducirRecuperacion(e, { tipo: 'ELEGIR_METODO' })
  assert.equal(e.paso, PASOS.CORREO)
  assert.equal(reducirRecuperacion(e, { tipo: 'CODIGO_VERIFICADO', prueba: 'x' }).paso, PASOS.CORREO)
  e = reducirRecuperacion(e, { tipo: 'CODIGO_ENVIADO', correo: 'a@b.co', reenvioEn: 30 })
  assert.deepEqual([e.paso, e.correo, e.reenvioEn], [PASOS.CODIGO, 'a@b.co', 30])
  assert.equal(reducirRecuperacion(e, { tipo: 'CODIGO_VERIFICADO', prueba: '' }).paso, PASOS.CODIGO) // sin prueba no avanza
  e = reducirRecuperacion(e, { tipo: 'CODIGO_VERIFICADO', prueba: 'prueba-del-backend' })
  assert.equal(e.paso, PASOS.NUEVA)
  assert.equal(reducirRecuperacion(e, { tipo: 'VOLVER' }).paso, PASOS.NUEVA) // el código ya se consumió
  const exito = reducirRecuperacion(e, { tipo: 'CONTRASENA_CAMBIADA' })
  assert.deepEqual([exito.paso, exito.prueba], [PASOS.EXITO, null])
})

test('volver desde el código borra la prueba y la verificación perdida reinicia con aviso', () => {
  let e = { ...ESTADO_INICIAL, paso: PASOS.CODIGO, correo: 'a@b.co' }
  assert.equal(reducirRecuperacion(e, { tipo: 'VOLVER' }).paso, PASOS.CORREO)
  e = { ...ESTADO_INICIAL, paso: PASOS.NUEVA, prueba: 'p' }
  const r = reducirRecuperacion(e, { tipo: 'VERIFICACION_PERDIDA', aviso: 'venció' })
  assert.deepEqual([r.paso, r.prueba, r.aviso], [PASOS.CORREO, null, 'venció'])
  assert.deepEqual(reducirRecuperacion(r, { tipo: 'REINICIAR' }), ESTADO_INICIAL)
})
