import test from 'node:test'
import assert from 'node:assert/strict'
import { compraEjemplo } from '../vistaDatosEjemplo.js'
import { vistaCambioSimulado } from './vistaCambioSimulado.js'
import { documentosCambio, resumenDocumento } from './documentosCambio.js'

const cambio = {
  idVenta: compraEjemplo.idVenta,
  idPasaje: 26,
  numeroBoleto: 'RL-B-000026',
  viaje: {
    origen: 'Trujillo', destino: 'Chiclayo', fechaSalida: '2026-11-19',
    horaSalida: '22:00', empresa: 'RutaLibre', tipoBus: 'Bus Cama',
  },
  asiento: '22',
  montoAdicional: 5,
}

test('al cambiar un pasaje salen dos PDF: el viaje original con los que quedan y el pasaje nuevo', () => {
  const [original, cambiado, ...resto] = documentosCambio(vistaCambioSimulado(compraEjemplo, cambio))
  assert.equal(resto.length, 0)

  assert.equal(original.tipo, 'original')
  assert.equal(original.viaje.destino, 'Cajamarca')
  assert.deepEqual(original.boletos.map((b) => b.numeroBoleto), ['RL-B-000025', 'RL-B-000027'])
  assert.equal(original.total, 86)

  assert.equal(cambiado.tipo, 'cambiado')
  assert.equal(cambiado.viaje.destino, 'Chiclayo')
  assert.equal(cambiado.boletos[0].asiento, '22')
  assert.equal(cambiado.anterior.asiento, '4B')
  assert.equal(cambiado.total, 48)
})

test('sin cambios hay un solo PDF con todos los boletos', () => {
  const documentos = documentosCambio(compraEjemplo)
  assert.equal(documentos.length, 1)
  assert.equal(documentos[0].boletos.length, 3)
  assert.equal(resumenDocumento(documentos[0]), '3 pasajes · Trujillo → Cajamarca')
})

test('si se cambian todos los pasajes no queda PDF del viaje original', () => {
  const compra = {
    ...compraEjemplo,
    boletos: [{ ...compraEjemplo.boletos[0], viajeVigente: cambio.viaje, cambio: { anterior: {}, adicionalPagado: 0 } }],
  }
  const documentos = documentosCambio(compra)
  assert.deepEqual(documentos.map((d) => d.tipo), ['cambiado'])
  assert.equal(resumenDocumento(documentos[0]), 'Boleto RL-B-000025 · Trujillo → Chiclayo')
})

test('cada PDF tiene su propio nombre de archivo', async () => {
  const { nombreArchivoMock } = await import('../servicios/pdfCompraMock.js')
  const [original, cambiado] = documentosCambio(vistaCambioSimulado(compraEjemplo, cambio))
  assert.equal(nombreArchivoMock(compraEjemplo, original), 'RutaLibre-RL-C-000022-viaje-original-prueba.pdf')
  assert.equal(nombreArchivoMock(compraEjemplo, cambiado), 'RutaLibre-RL-C-000022-RL-B-000026-cambiado-prueba.pdf')
})
