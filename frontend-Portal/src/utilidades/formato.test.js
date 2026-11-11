import assert from 'node:assert/strict'
import test from 'node:test'
import { formatearFechaCorta, formatearFechaLarga, formatearPrecio, iniciales } from './formato.js'

test('formatea importes y no revienta con datos ausentes', () => {
  assert.equal(formatearPrecio(190), 'S/ 190.00')
  assert.equal(formatearPrecio('95.5'), 'S/ 95.50')
  assert.equal(formatearPrecio(12, 'USD'), 'USD 12.00')
  assert.equal(formatearPrecio(null), '—')
  assert.equal(formatearPrecio(undefined), '—')
  assert.equal(formatearPrecio('abc'), '—')
})

test('formatea fechas ISO y devuelve — si no son válidas', () => {
  assert.match(formatearFechaLarga('2026-10-19'), /19 de octubre de 2026/)
  assert.match(formatearFechaCorta('2026-10-19'), /19/)
  assert.equal(formatearFechaLarga(null), '—')
  assert.equal(formatearFechaCorta('no-es-fecha'), '—')
})

test('iniciales', () => {
  assert.equal(iniciales('mathias', 'castillo'), 'MC')
  assert.equal(iniciales(undefined, undefined), '')
})
