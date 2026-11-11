import assert from 'node:assert/strict'
import test from 'node:test'
import { contenidoDocumento, nombreArchivoPdf, tituloDocumento } from './pdfBoleto.js'

const compra = {
  idVenta: 7, codigoCompra: 'RL-C-000007', comprobante: 'B001-00000042', vigente: true, documentoDisponible: true,
  origen: 'Lima', destino: 'Cusco', fechaSalida: '2026-10-19', horaSalida: '08:00', empresa: 'RutaLibre', tipoBus: 'Bus Cama',
  moneda: 'PEN', total: 190,
  boletos: [
    { idPasaje: 20, numeroBoleto: 'RL-B-000020', pasajero: 'ANA LOPEZ', documento: 'DNI ****111', asiento: '12A', precio: 95 },
    { idPasaje: 21, numeroBoleto: 'RL-B-000021', pasajero: 'LUIS PEREZ', documento: 'DNI ****222', asiento: '12B', precio: 95 },
  ],
}

test('el documento contiene solo datos de la compra recibida', () => {
  const doc = contenidoDocumento(compra)
  assert.equal(doc.titulo, 'BOLETO ELECTRÓNICO')
  assert.equal(doc.ruta, 'Lima > Cusco')
  assert.deepEqual(doc.encabezado[0], ['Compra', 'RL-C-000007'])
  assert.deepEqual(doc.encabezado[1], ['Comprobante', 'B001-00000042'])
  assert.equal(doc.boletos.length, 2)
  assert.equal(doc.boletos[1].etiqueta, 'Boleto 2 · RL-B-000021')
  assert.equal(doc.boletos[1].asiento, 'Asiento 12B')
  assert.equal(doc.boletos[1].precio, 'S/ 95.00')
  assert.equal(doc.total, 'S/ 190.00')
  assert.match(doc.nota, /No incluye código QR/)
  assert.ok(!JSON.stringify(doc).includes('DEMO'))
})

test('un viaje ya realizado genera constancia, no boleto', () => {
  assert.equal(tituloDocumento({ ...compra, vigente: false }), 'CONSTANCIA DE COMPRA')
})

test('no emite documento si el backend no lo habilitó', () => {
  assert.throws(() => contenidoDocumento({ ...compra, documentoDisponible: false }), /no está disponible/)
  assert.throws(() => contenidoDocumento(null), /no está disponible/)
})

test('el nombre del archivo es seguro', () => {
  assert.equal(nombreArchivoPdf(compra), 'RutaLibre-RL-C-000007.pdf')
  assert.equal(nombreArchivoPdf({ idVenta: 1, codigoCompra: '../x y' }), 'RutaLibre-___x_y.pdf')
})
