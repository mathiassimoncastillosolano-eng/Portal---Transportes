import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ajustarAlRango, aIso, estaEnRango, inicioPaginaAnios, leerIso, limitesNacimiento, mesEnRango, textoFecha,
} from './fechaNacimiento.js'

const HOY = new Date(2026, 9, 12) // 12 oct 2026 (local)
const L = limitesNacimiento(HOY)

test('el rango va de hoy-120 años a hoy, ambos incluidos', () => {
  assert.deepEqual(L.max, { anio: 2026, mes: 9, dia: 12 })
  assert.deepEqual(L.min, { anio: 1906, mes: 9, dia: 12 })
  assert.equal(estaEnRango({ anio: 2026, mes: 9, dia: 12 }, L), true)
  assert.equal(estaEnRango({ anio: 2026, mes: 9, dia: 13 }, L), false)
  assert.equal(estaEnRango({ anio: 1906, mes: 9, dia: 12 }, L), true)
  assert.equal(estaEnRango({ anio: 1906, mes: 9, dia: 11 }, L), false)
})

test('29 de febrero: el mínimo cae en 28 si ese año no es bisiesto', () => {
  const l = limitesNacimiento(new Date(2024, 1, 29))
  assert.deepEqual(l.min, { anio: 1904, mes: 1, dia: 29 }) // 1904 sí es bisiesto
  const l2 = limitesNacimiento(new Date(2020, 1, 29))
  assert.deepEqual(l2.min, { anio: 1900, mes: 1, dia: 28 }) // 1900 no lo es
})

test('leerIso rechaza fechas inexistentes y formatos raros', () => {
  assert.deepEqual(leerIso('1998-03-15'), { anio: 1998, mes: 2, dia: 15 })
  assert.equal(leerIso('1998-02-30'), null)
  assert.equal(leerIso('15/03/1998'), null)
  assert.equal(leerIso(''), null)
})

test('aIso e ida y vuelta no cambian el día (sin UTC)', () => {
  assert.equal(aIso(2000, 0, 1), '2000-01-01')
  assert.equal(aIso(1999, 11, 31), '1999-12-31')
  const f = leerIso('2000-02-29')
  assert.equal(aIso(f.anio, f.mes, f.dia), '2000-02-29')
})

test('al cambiar de mes el día se ajusta (31 → 28/29) y respeta el rango', () => {
  assert.deepEqual(ajustarAlRango(2001, 1, 31, L), { anio: 2001, mes: 1, dia: 28 })
  assert.deepEqual(ajustarAlRango(2024, 1, 31, L), { anio: 2024, mes: 1, dia: 29 })
  assert.deepEqual(ajustarAlRango(2026, 9, 30, L), L.max)
  assert.deepEqual(ajustarAlRango(1906, 9, 1, L), L.min)
})

test('mesEnRango y páginas de años', () => {
  assert.equal(mesEnRango(2026, 9, L), true)
  assert.equal(mesEnRango(2026, 10, L), false)
  assert.equal(mesEnRango(1906, 8, L), false)
  assert.equal(inicioPaginaAnios(1998), 1992)
  assert.equal(inicioPaginaAnios(2004), 2004)
})

test('textoFecha', () => {
  assert.equal(textoFecha('1998-03-05'), '5 de marzo de 1998')
  assert.equal(textoFecha('x'), '')
})
