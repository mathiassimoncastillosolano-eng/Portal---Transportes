import assert from 'node:assert/strict'
import test from 'node:test'
import {
  agruparPasajes, avisoTotal, contarPorFiltro, datosFaltantes, estadoVisible, filtrarHistorial, textoAsientos,
} from './pasajesVista.js'

const base = { estado: 'CONFIRMADA', fase: 'PROXIMO', estadoViaje: 'PROGRAMADO', vigente: true, origen: 'Lima', destino: 'Cusco',
  fechaSalida: '2026-10-19', horaSalida: '08:00', tipoBus: 'Bus Cama', totalConsistente: true,
  boletos: [{ asiento: '12A', pasajero: 'Ana' }, { asiento: '12B', pasajero: 'Luis' }] }

test('el estado visible no confunde el pago con el viaje', () => {
  assert.deepEqual(estadoVisible(base), { clave: 'confirmado', etiqueta: 'Confirmado' })
  assert.equal(estadoVisible({ ...base, fase: 'REALIZADO', vigente: false }).etiqueta, 'Viaje realizado')
  assert.equal(estadoVisible({ ...base, fase: 'NO_REALIZADO', estadoViaje: 'CANCELADO' }).etiqueta, 'Viaje cancelado')
  assert.equal(estadoVisible({ ...base, fase: 'NO_REALIZADO', estadoViaje: 'SUSPENDIDO' }).etiqueta, 'Viaje no realizado')
  assert.equal(estadoVisible({ ...base, estado: 'SIN_CONFIRMAR' }).etiqueta, 'Pago sin confirmar')
  assert.equal(estadoVisible({ ...base, estado: 'REEMBOLSADA' }).etiqueta, 'Reembolsado')
  assert.equal(estadoVisible({ ...base, fase: 'SIN_INFORMACION' }).etiqueta, 'Sin información')
  assert.equal(estadoVisible(null).etiqueta, 'Sin información')
})

test('separa vigentes de anteriores sin reordenar lo que entrega el backend', () => {
  const compras = [{ idVenta: 1, vigente: false }, { idVenta: 2, vigente: true }, { idVenta: 3, vigente: false }, { idVenta: 4, vigente: true }]
  const { vigentes, anteriores } = agruparPasajes(compras)
  assert.deepEqual(vigentes.map((c) => c.idVenta), [2, 4])
  assert.deepEqual(anteriores.map((c) => c.idVenta), [1, 3])
  assert.deepEqual(agruparPasajes(undefined), { vigentes: [], anteriores: [] })
})

test('los filtros del historial reparten cada compra en una sola categoría', () => {
  const compras = [
    { idVenta: 1, estado: 'CONFIRMADA', fase: 'REALIZADO' },
    { idVenta: 2, estado: 'CONFIRMADA', fase: 'NO_REALIZADO' },
    { idVenta: 3, estado: 'REEMBOLSADA', fase: 'NO_REALIZADO' },
    { idVenta: 4, estado: 'SIN_CONFIRMAR', fase: 'PROXIMO' },
  ]
  assert.deepEqual(filtrarHistorial(compras, 'realizados').map((c) => c.idVenta), [1])
  assert.deepEqual(filtrarHistorial(compras, 'cancelados').map((c) => c.idVenta), [2])
  assert.deepEqual(filtrarHistorial(compras, 'otros').map((c) => c.idVenta), [3, 4])
  assert.equal(filtrarHistorial(compras, 'todos').length, 4)
  assert.deepEqual(contarPorFiltro(compras), { todos: 4, realizados: 1, cancelados: 1, otros: 2 })
})

test('lista los asientos reales y no inventa los que faltan', () => {
  assert.equal(textoAsientos(base), '12A, 12B')
  assert.equal(textoAsientos({ boletos: [] }), null)
  assert.equal(textoAsientos({ boletos: [{ asiento: null }] }), null)
})

test('indica qué datos faltan en una compra incompleta', () => {
  assert.deepEqual(datosFaltantes(base), [])
  const f = datosFaltantes({ boletos: [] })
  assert.ok(f.includes('el trayecto') && f.includes('la fecha u hora de salida') && f.includes('los boletos'))
  assert.ok(datosFaltantes({ ...base, boletos: [{ asiento: null, pasajero: 'x' }] }).includes('el asiento o el pasajero de algún boleto'))
})

test('avisa cuando el total no coincide con los boletos, pero no si no hay boletos', () => {
  assert.equal(avisoTotal(base), null)
  assert.match(avisoTotal({ ...base, totalConsistente: false }), /no coincide/)
  assert.equal(avisoTotal({ ...base, totalConsistente: false, boletos: [] }), null)
})
