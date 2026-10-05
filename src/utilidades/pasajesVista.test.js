import assert from 'node:assert/strict'
import test from 'node:test'
import { comprasVigentes, nombreDelPasajero, pasajesVigentes, salidaDePasaje } from './pasajesVista.js'

test('muestra solo pasajes confirmados con salida futura y los ordena por salida', () => {
  const ahora = new Date(2026, 9, 3, 10, 0)
  const pasajes = [
    { codigo: 'B', estado: 'confirmado', fecha: '2026-10-05', hora: '08:00' },
    { codigo: 'C', estado: 'cancelado', fecha: '2026-10-04', hora: '08:00' },
    { codigo: 'D', estado: 'confirmado', fecha: '2026-10-02', hora: '08:00' },
    { codigo: 'A', estado: 'confirmado', fecha: '2026-10-04', hora: '08:00' },
  ]
  assert.deepEqual(pasajesVigentes(pasajes, ahora).map((p) => p.codigo), ['A', 'B'])
  assert.equal(pasajes[0].codigo, 'B')
})

test('rechaza fechas imposibles y conserva el pasajero del boleto', () => {
  assert.equal(salidaDePasaje({ fecha: '2026-02-30', hora: '08:00' }), null)
  assert.equal(nombreDelPasajero({ pasajero: { nombres: 'Ana', apellidos: 'Pérez' } }), 'Ana Pérez')
  assert.equal(nombreDelPasajero({ pasajero: 'Luis Gómez' }), 'Luis Gómez')
  assert.equal(nombreDelPasajero({}), '')
})

test('agrupa asientos de una compra y calcula el total sin copiar nombres', () => {
  const ahora = new Date(2026, 9, 3, 10, 0)
  const base = { estado: 'confirmado', fecha: '2026-10-05', hora: '08:00', origen: 'Lima', destino: 'Cusco' }
  const compras = comprasVigentes([
    { ...base, compraId: 'C1', codigo: 'A', asiento: '12A', precio: 95, pasajero: 'Ana' },
    { ...base, compraId: 'C1', codigo: 'B', asiento: '12B', precio: 95 },
    { ...base, compraId: 'C2', codigo: 'C', asiento: '13A', precio: 80 },
  ], ahora)
  assert.equal(compras.length, 2)
  assert.deepEqual(compras[0].boletos.map((b) => b.asiento), ['12A', '12B'])
  assert.equal(compras[0].total, 190)
  assert.equal(Object.hasOwn(compras[0], 'pasajero'), false)
  assert.equal(Object.hasOwn(compras[0].boletos[0], 'pasajero'), false)
  assert.equal(compras[1].total, 80)
})
