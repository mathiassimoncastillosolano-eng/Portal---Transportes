import test from 'node:test'
import assert from 'node:assert/strict'
import { aplicarPostergacion } from '../../utilidades/postergacion.js'
import { guardarPasajeMock, obtenerCompraDemo, obtenerPasajeMock } from './pasajes.js'

test('la compra de prueba cambia solo el boleto elegido y conserva la compra original', () => {
  const cliente = 'cliente-prueba-compra'
  const antes = obtenerCompraDemo(cliente)
  assert.equal(antes.boletos.length, 3)
  assert.equal(antes.totalPagado, antes.total)

  const pasaje = obtenerPasajeMock('PSJ-2002', cliente)
  const nuevo = aplicarPostergacion(pasaje, {
    id: 'MV-NUEVO', origen: 'Trujillo', destino: 'Chiclayo',
    fechaSalida: '2026-11-25', horaSalida: '13:00', horaLlegada: '16:30',
    empresa: 'Costa Norte', tipoBus: 'Cama',
  }, { idAsiento: 20, numero: '12A', piso: 1 }, 17)
  guardarPasajeMock(nuevo, cliente)

  const despues = obtenerCompraDemo(cliente)
  assert.equal(despues.boletos[0].cambio, null)
  assert.equal(despues.boletos[2].cambio, null)
  assert.equal(despues.boletos[1].viajeVigente.destino, 'Chiclayo')
  assert.equal(despues.boletos[1].asiento, '12A')
  assert.equal(despues.boletos[1].cambio.anterior.asiento, '4B')
  assert.equal(despues.totalPagado, despues.total + 17)
  assert.equal(despues.codigoCompra, antes.codigoCompra)
})
