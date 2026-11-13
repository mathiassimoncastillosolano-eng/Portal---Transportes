import test from 'node:test'
import assert from 'node:assert/strict'
import { compraEjemplo } from '../vistaDatosEjemplo.js'
import { vistaCambioSimulado } from './vistaCambioSimulado.js'

const cambio = {
  idVenta: compraEjemplo.idVenta,
  idPasaje: 26,
  numeroBoleto: 'RL-B-000026',
  viaje: {
    origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-24',
    horaSalida: '08:00', empresa: 'RutaLibre', tipoBus: 'Bus Cama',
  },
  asiento: '12A',
  montoAdicional: 17,
}

test('la vista previa cambia un solo boleto y conserva intacta la compra recibida', () => {
  const vista = vistaCambioSimulado(compraEjemplo, cambio)
  assert.equal(vista.boletos[0].asiento, '4A')
  assert.equal(vista.boletos[2].asiento, '5B')
  assert.equal(vista.boletos[1].asiento, '12A')
  assert.equal(vista.boletos[1].viajeVigente.destino, 'Lima')
  assert.equal(vista.boletos[1].cambio.anterior.asiento, '4B')
  assert.equal(vista.totalPagado, 146)
  assert.equal(compraEjemplo.boletos[1].asiento, '4B')
  assert.equal(compraEjemplo.total, 129)
})

test('ignora resultados que no pertenecen a esta compra o boleto', () => {
  assert.equal(vistaCambioSimulado(compraEjemplo, { ...cambio, idVenta: 99 }), compraEjemplo)
  assert.equal(vistaCambioSimulado(compraEjemplo, { ...cambio, numeroBoleto: 'otro' }), compraEjemplo)
})
