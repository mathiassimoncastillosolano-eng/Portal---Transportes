import test from 'node:test'
import assert from 'node:assert/strict'
import { validarRegistro } from './validarRegistro.js'

const cuenta = {
  nombres: 'Lucas', apellidos: 'Prueba', correo: 'lucas@example.com', telefono: '',
  contrasena: 'Registro2026!', confirmarContrasena: 'Registro2026!',
}

test('acepta una cuenta sin telefono y correo con espacios exteriores', () => {
  assert.deepEqual(validarRegistro({ ...cuenta, correo: ' LUCAS@example.com ' }), {})
})

test('rechaza contraseña corta, confirmacion distinta y correo invalido', () => {
  const errores = validarRegistro({ ...cuenta, contrasena: '123', correo: 'sin-arroba' })
  assert.ok(errores.contrasena)
  assert.ok(errores.confirmarContrasena)
  assert.ok(errores.correo)
})

test('valida limite de BCrypt en bytes UTF-8', () => {
  assert.ok(validarRegistro({ ...cuenta, contrasena: 'ñ'.repeat(37) }).contrasena)
  assert.equal(validarRegistro({ ...cuenta, contrasena: 'a'.repeat(72), confirmarContrasena: 'a'.repeat(72) }).contrasena, undefined)
})

test('valida longitudes maximas y nombres vacios', () => {
  const errores = validarRegistro({ ...cuenta, nombres: ' ', apellidos: 'x'.repeat(101), telefono: '1'.repeat(21) })
  assert.ok(errores.nombres)
  assert.ok(errores.apellidos)
  assert.ok(errores.telefono)
})
