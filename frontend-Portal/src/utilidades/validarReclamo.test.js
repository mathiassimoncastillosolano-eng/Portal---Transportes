import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  construirPayload,
  crearFormularioInicial,
  validarDocumento,
  validarPaso,
  validarTodo,
} from './validarReclamo.js'

const HOY = '2026-11-12'

function formularioCompleto() {
  return {
    ...crearFormularioInicial(),
    nombresCompletos: 'María Fernanda Quispe Rojas',
    numeroDocumento: '12345678',
    domicilio: 'Av. España 123, Trujillo',
    telefono: '987654321',
    correo: 'maria@correo.com',
    tipoRequerimiento: 'RECLAMO',
    descripcionServicio: 'Viaje Trujillo - Lima',
    fechaIncidente: '2026-11-10',
    detalleHechos: 'El bus salió con dos horas de retraso sin aviso previo.',
    pedidoConsumidor: 'Devolución parcial del pasaje.',
    declaracionVeracidad: true,
    autorizaTratamientoDatos: true,
  }
}

test('valida la longitud y el formato de cada tipo de documento', () => {
  assert.equal(validarDocumento('DNI', '12345678'), null)
  assert.match(validarDocumento('DNI', '1234567'), /8 dígitos/)
  assert.match(validarDocumento('DNI', '1234567A'), /8 dígitos/)
  assert.equal(validarDocumento('CE', '001234567'), null)
  assert.match(validarDocumento('CE', '1234'), /carné/)
  assert.equal(validarDocumento('PASAPORTE', 'ab12345'), null)
  assert.match(validarDocumento('PASAPORTE', '12'), /pasaporte/)
  assert.match(validarDocumento('DNI', ''), /Ingresa/)
})

test('un formulario completo no tiene errores', () => {
  assert.equal(validarTodo(formularioCompleto(), HOY), null)
})

test('los datos personales exigen todos los campos y correo válido', () => {
  const errores = validarPaso(0, { ...crearFormularioInicial(), correo: 'no-es-correo' }, HOY)
  assert.deepEqual(
    Object.keys(errores).sort(),
    ['correo', 'domicilio', 'nombresCompletos', 'numeroDocumento', 'telefono'],
  )
})

test('rechaza fechas de incidente futuras o inexistentes', () => {
  assert.match(validarPaso(2, { ...formularioCompleto(), fechaIncidente: '2026-11-13' }, HOY).fechaIncidente, /futura/)
  assert.match(validarPaso(2, { ...formularioCompleto(), fechaIncidente: '2026-02-30' }, HOY).fechaIncidente, /válida/)
})

test('el monto es opcional pero debe ser válido si se escribe', () => {
  assert.equal(validarPaso(2, { ...formularioCompleto(), montoReclamado: '' }, HOY).montoReclamado, undefined)
  assert.equal(validarPaso(2, { ...formularioCompleto(), montoReclamado: '45.50' }, HOY).montoReclamado, undefined)
  assert.ok(validarPaso(2, { ...formularioCompleto(), montoReclamado: '-3' }, HOY).montoReclamado)
  assert.ok(validarPaso(2, { ...formularioCompleto(), montoReclamado: '10.999' }, HOY).montoReclamado)
})

test('el detalle y el pedido respetan mínimos y máximos', () => {
  const corto = validarPaso(2, { ...formularioCompleto(), detalleHechos: 'poco', pedidoConsumidor: 'x' }, HOY)
  assert.ok(corto.detalleHechos && corto.pedidoConsumidor)
  const largo = validarPaso(2, { ...formularioCompleto(), detalleHechos: 'a'.repeat(2001) }, HOY)
  assert.match(largo.detalleHechos, /2000/)
})

test('las declaraciones son obligatorias antes de enviar', () => {
  const errores = validarPaso(3, { ...formularioCompleto(), declaracionVeracidad: false, autorizaTratamientoDatos: false }, HOY)
  assert.ok(errores.declaracionVeracidad && errores.autorizaTratamientoDatos)
})

test('con pasaje seleccionado no se envían los datos manuales del servicio', () => {
  const payload = construirPayload(
    { ...formularioCompleto(), idPasaje: '15', origen: 'Lima', destino: 'Piura', numeroAsiento: '3' },
    'clave',
  )
  assert.equal(payload.idPasaje, 15)
  assert.equal(payload.origen, null)
  assert.equal(payload.destino, null)
  assert.equal(payload.numeroAsiento, null)
})

test('sin pasaje se envían los datos manuales y los vacíos viajan como null', () => {
  const payload = construirPayload({ ...formularioCompleto(), origen: ' Lima ', montoReclamado: '45,5' }, 'clave')
  assert.equal(payload.idPasaje, null)
  assert.equal(payload.origen, 'Lima')
  assert.equal(payload.destino, null)
  assert.equal(payload.montoReclamado, 45.5)
  assert.equal(payload.correo, 'maria@correo.com')
  assert.equal(payload.claveIdempotencia, 'clave')
})
