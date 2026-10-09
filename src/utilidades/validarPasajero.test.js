import test from 'node:test'
import assert from 'node:assert/strict'
import {
  combinarErrores,
  construirPasajerosApi,
  documentosRepetidos,
  esMenorDeEdad,
  mapearErroresServidor,
  MENSAJE_DNI_REPETIDO,
  pasajeroEstaCompleto,
  validarPasajero,
} from './validarPasajero.js'

const hoy = new Date(2026, 9, 8) // 8-oct-2026
const valido = { nombres: ' María Fernanda ', apellidos: "Torres-Quispe", dni: '12345678', fechaNacimiento: '1990-05-01', celular: '912345678' }

test('acepta un pasajero correcto', () => {
  assert.deepEqual(validarPasajero(valido, hoy), {})
  assert.ok(pasajeroEstaCompleto(valido, hoy))
})

test('campos vacíos: mensajes de obligatorio', () => {
  assert.deepEqual(validarPasajero({ nombres: '', apellidos: '', dni: '', fechaNacimiento: '', celular: '' }, hoy), {
    dni: 'Ingresa el DNI.', nombres: 'Ingresa los nombres.', apellidos: 'Ingresa los apellidos.',
    fechaNacimiento: 'Selecciona la fecha de nacimiento.', celular: 'Ingresa el celular.',
  })
})

test('DNI y celular: longitud y letras', () => {
  assert.equal(validarPasajero({ ...valido, dni: '1234567' }, hoy).dni, 'El DNI debe tener 8 dígitos.')
  assert.equal(validarPasajero({ ...valido, dni: '1234567a' }, hoy).dni, 'El DNI debe tener 8 dígitos.')
  assert.equal(validarPasajero({ ...valido, celular: '812345678' }, hoy).celular, 'Ingresa un celular válido (9 dígitos).')
  assert.equal(validarPasajero({ ...valido, celular: '91234567a' }, hoy).celular, 'Ingresa un celular válido (9 dígitos).')
})

test('nombres: tildes, apóstrofes y puntos sí; números, 1 letra y >100 no', () => {
  assert.deepEqual(validarPasajero({ ...valido, nombres: "D'Angelo Núñez", apellidos: 'O’Brien Ñ.' }, hoy), {})
  assert.equal(validarPasajero({ ...valido, nombres: 'Ana2' }, hoy).nombres, 'Ingresa un nombre válido.')
  assert.equal(validarPasajero({ ...valido, apellidos: 'P' }, hoy).apellidos, 'Ingresa un apellido válido.')
  assert.equal(validarPasajero({ ...valido, nombres: 'A'.repeat(101) }, hoy).nombres, 'Máximo 100 caracteres.')
})

test('fecha: inexistente, futura y de más de 120 años son inválidas', () => {
  const msg = 'Ingresa una fecha de nacimiento válida.'
  assert.equal(validarPasajero({ ...valido, fechaNacimiento: '2001-02-31' }, hoy).fechaNacimiento, msg)
  assert.equal(validarPasajero({ ...valido, fechaNacimiento: '2026-10-09' }, hoy).fechaNacimiento, msg)
  assert.equal(validarPasajero({ ...valido, fechaNacimiento: '1905-10-07' }, hoy).fechaNacimiento, msg)
  assert.equal(validarPasajero({ ...valido, fechaNacimiento: '1906-10-08' }, hoy).fechaNacimiento, undefined)
  assert.equal(validarPasajero({ ...valido, fechaNacimiento: '2008-02-29' }, hoy).fechaNacimiento, undefined)
  assert.equal(validarPasajero({ ...valido, fechaNacimiento: '2009-02-29' }, hoy).fechaNacimiento, msg)
})

test('menores de 16 no pueden viajar; de 16 a 17 es válido y solo genera aviso', () => {
  assert.equal(validarPasajero({ ...valido, fechaNacimiento: '2018-03-10' }, hoy).fechaNacimiento, 'Debe tener al menos 16 años.')
  assert.equal(validarPasajero({ ...valido, fechaNacimiento: '2010-10-09' }, hoy).fechaNacimiento, 'Debe tener al menos 16 años.')
  const adolescente = { ...valido, fechaNacimiento: '2010-10-08' } // cumple 16 hoy
  assert.deepEqual(validarPasajero(adolescente, hoy), {})
  assert.ok(esMenorDeEdad('2010-10-08', hoy))
})

test('esMenorDeEdad: borde de los 18 años', () => {
  assert.equal(esMenorDeEdad('2008-10-08', hoy), false) // cumple 18 hoy
  assert.equal(esMenorDeEdad('2008-10-09', hoy), true)  // cumple mañana
  assert.equal(esMenorDeEdad('2026-10-08', hoy), true)  // nace hoy
  assert.equal(esMenorDeEdad('2026-10-09', hoy), false) // futura: no es "menor", es inválida
  assert.equal(esMenorDeEdad('', hoy), false)
  assert.equal(esMenorDeEdad('2001-02-31', hoy), false)
})

test('DNI repetido: error en el 2.º y siguientes, no en el 1.º', () => {
  const errores = documentosRepetidos([
    { clave: '1-1A', dni: '12345678' }, { clave: '1-1B', dni: '87654321' },
    { clave: '1-2A', dni: '12345678' }, { clave: '1-2B', dni: ' 12345678 ' },
  ])
  assert.deepEqual(errores, { '1-2A': { dni: MENSAJE_DNI_REPETIDO }, '1-2B': { dni: MENSAJE_DNI_REPETIDO } })
  assert.deepEqual(documentosRepetidos([{ clave: 'a', dni: '123' }, { clave: 'b', dni: '123' }]), {})
})

test('combinarErrores: une por asiento y gana el primero en un mismo campo', () => {
  const unidos = combinarErrores({ a: { dni: 'uno' } }, { a: { dni: 'dos', celular: 'tres' }, b: { dni: 'x' } })
  assert.deepEqual(unidos, { a: { dni: 'uno', celular: 'tres' }, b: { dni: 'x' } })
})

test('construirPasajerosApi mapea dni->numeroDocumento y celular->nroTelefono', () => {
  const cuerpo = construirPasajerosApi([{ clave: '1-1A', idAsiento: 7 }], { '1-1A': valido })
  assert.deepEqual(cuerpo, [{
    idAsiento: 7, tipoDocumento: 'DNI', numeroDocumento: '12345678', nombres: 'María Fernanda',
    apellidos: 'Torres-Quispe', fechaNacimiento: '1990-05-01', nroTelefono: '912345678',
  }])
})

test('mapearErroresServidor lleva idAsiento->clave y campos API->formulario', () => {
  const asientos = [{ clave: '1-1A', idAsiento: 7 }, { clave: '2-3B', idAsiento: 9 }]
  const resultado = mapearErroresServidor([
    { idAsiento: 7, campo: 'numeroDocumento', mensaje: 'Este DNI ya tiene un pasaje en este viaje.' },
    { idAsiento: 7, campo: 'nroTelefono', mensaje: 'Ingresa el celular.' },
    { idAsiento: 9, campo: 'pasajero', mensaje: 'Faltan los datos del pasajero de este asiento.' },
    { idAsiento: 99, campo: 'nombres', mensaje: 'ignorado: asiento desconocido' },
  ], asientos)
  assert.deepEqual(resultado, {
    '1-1A': { dni: 'Este DNI ya tiene un pasaje en este viaje.', celular: 'Ingresa el celular.' },
    '2-3B': { asiento: 'Faltan los datos del pasajero de este asiento.' },
  })
})