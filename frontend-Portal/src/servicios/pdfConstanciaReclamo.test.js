import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contenidoConstancia, nombreArchivoConstancia, textoParaPdf } from './pdfConstanciaReclamo.js'

const constancia = {
  codigo: 'RL-2026-000001',
  fechaRegistro: '2026-11-12T10:30:00',
  fechaLimiteRespuesta: '2026-12-04',
  diasHabilesPlazo: 15,
  tipoRequerimiento: 'RECLAMO',
  estado: 'REGISTRADO',
  consumidor: {
    nombresCompletos: 'María Quispe',
    tipoDocumento: 'DNI',
    numeroDocumento: '12345678',
    domicilio: 'Av. España 123',
    telefono: '987654321',
    correo: 'maria@correo.com',
  },
  servicio: {
    servicioInvolucrado: 'Transporte terrestre de pasajeros',
    codigoPasaje: null,
    codigoViaje: null,
    fechaServicio: null,
    origen: 'Trujillo',
    destino: 'Lima',
    numeroAsiento: null,
  },
  requerimiento: {
    descripcionServicio: 'Viaje Trujillo - Lima',
    fechaIncidente: '2026-11-10',
    montoReclamado: null,
    moneda: 'PEN',
    detalleHechos: 'El bus salió con retraso.',
    pedidoConsumidor: 'Devolución parcial.',
  },
  comunicacion: { medioRespuesta: 'CORREO', correoRespuesta: 'maria@correo.com' },
}

test('el contenido refleja exactamente lo registrado', () => {
  const contenido = contenidoConstancia(constancia, { razonSocial: 'Transportes', ruc: '10608894131' })
  assert.equal(contenido.codigo, 'RL-2026-000001')
  assert.equal(contenido.hechos, 'El bus salió con retraso.')
  assert.equal(contenido.pedido, 'Devolución parcial.')
  assert.deepEqual(contenido.proveedor, [['Razón social', 'Transportes'], ['RUC', '10608894131']])
  assert.deepEqual(contenido.servicio.map(([etiqueta]) => etiqueta), ['Servicio involucrado', 'Origen', 'Destino'])
  assert.ok(contenido.registro.some(([etiqueta, valor]) => etiqueta === 'Tipo de requerimiento' && valor === 'Reclamo'))
  assert.ok(contenido.requerimiento.some(([etiqueta, valor]) => etiqueta === 'Monto reclamado' && valor === 'No indicado'))
})

test('no inventa datos del proveedor que no se configuraron', () => {
  assert.deepEqual(contenidoConstancia(constancia, {}).proveedor, [])
})

test('el nombre de archivo es seguro y el texto se adapta a la fuente del PDF', () => {
  assert.equal(nombreArchivoConstancia(constancia), 'Constancia-RL-2026-000001.pdf')
  assert.equal(textoParaPdf('“Hola” — niño ñandú 😀'), '"Hola" - niño ñandú ?')
})
