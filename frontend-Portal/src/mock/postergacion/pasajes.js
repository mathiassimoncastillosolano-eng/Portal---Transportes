import { fechaLocal } from '../../utilidades/fechas.js'
import { horaLlegadaMock, idViajeMock, precioBaseMock } from './viajes.js'
import { salidaMsDe } from '../../utilidades/postergacion.js'

const MS_HORA = 3_600_000
const MS_DIA = 24 * MS_HORA
const ID_CLIENTE_AJENO = 'cliente-ajeno-mock'
export const ID_COMPRA_DEMO = 9200
const IDS_COMPRA_DEMO = ['PSJ-2001', 'PSJ-2002', 'PSJ-2003']

let almacen = null
let clienteAlmacen = null

function formatearHora(fecha) {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`
}

function partesDeSalida(salidaMs) {
  const fecha = new Date(salidaMs)
  return { fechaSalida: fechaLocal(fecha), horaSalida: formatearHora(fecha) }
}

function crearPasaje(datos, ahoraMs, idCliente) {
  const { idPasaje, numero, origen, destino, tipoBus, empresa, asiento, salidaMs, estado, etiqueta, pasajero, idClienteDueno } = datos
  const { fechaSalida, horaSalida } = partesDeSalida(salidaMs)
  const precio = precioBaseMock(origen, destino, tipoBus)
  return {
    idPasaje,
    numeroBoleto: `RL-${String(numero).padStart(6, '0')}`,
    idVenta: 9000 + numero,
    codigoCompra: `C-${String(numero).padStart(6, '0')}`,
    idPagoOriginal: `PAGO-ORIG-${numero}`,
    idCliente: idClienteDueno ?? idCliente,
    estado,
    etiquetaMock: etiqueta,
    pasajero,
    idViaje: idViajeMock(origen, destino, fechaSalida, horaSalida),
    origen,
    destino,
    fechaSalida,
    horaSalida,
    horaLlegada: horaLlegadaMock(origen, destino, fechaSalida, horaSalida),
    empresa,
    tipoBus,
    asiento,
    precioPagado: precio,
    moneda: 'PEN',
    postergado: false,
    montoAdicionalPagado: 0,
    creadoMs: ahoraMs,
  }
}

function generarPasajes(ahoraMs, idCliente) {
  const minutoRedondeado = (ms) => Math.ceil(ms / 60_000) * 60_000
  const base = [
    { idPasaje: 'PSJ-1001', numero: 1001, origen: 'Trujillo', destino: 'Lima', tipoBus: 'Semi cama', empresa: 'RutaLibre Express', asiento: '12', salidaMs: salidaMsDe(fechaLocal(new Date(ahoraMs + 3 * MS_DIA)), '19:30'), estado: 'VIGENTE', etiqueta: 'Vigente · Semi cama S/ 60', pasajero: 'Pasajero de prueba' },
    { idPasaje: 'PSJ-1002', numero: 1002, origen: 'Lima', destino: 'Arequipa', tipoBus: 'Cama', empresa: 'Andes Travel', asiento: '7', salidaMs: salidaMsDe(fechaLocal(new Date(ahoraMs + 5 * MS_DIA)), '13:00'), estado: 'VIGENTE', etiqueta: 'Vigente · Cama S/ 125', pasajero: 'Pasajero de prueba' },
    { idPasaje: 'PSJ-1003', numero: 1003, origen: 'Trujillo', destino: 'Chiclayo', tipoBus: 'Económico', empresa: 'Costa Norte', asiento: '3', salidaMs: minutoRedondeado(ahoraMs + 6 * MS_HORA + 5 * 60_000), estado: 'VIGENTE', etiqueta: 'Vigente · salida en 6 h (límite válido)', pasajero: 'Pasajero de prueba' },
    { idPasaje: 'PSJ-1004', numero: 1004, origen: 'Trujillo', destino: 'Lima', tipoBus: 'Cama', empresa: 'Andes Travel', asiento: '20', salidaMs: minutoRedondeado(ahoraMs + 3 * MS_HORA + 30 * 60_000), estado: 'VIGENTE', etiqueta: 'Vigente · salida en menos de 6 h', pasajero: 'Pasajero de prueba' },
    { idPasaje: 'PSJ-1005', numero: 1005, origen: 'Lima', destino: 'Trujillo', tipoBus: 'Semi cama', empresa: 'RutaLibre Plus', asiento: '15', salidaMs: ahoraMs - 2 * MS_DIA, estado: 'USADO', etiqueta: 'No vigente · utilizado', pasajero: 'Pasajero de prueba' },
    { idPasaje: 'PSJ-1006', numero: 1006, origen: 'Arequipa', destino: 'Lima', tipoBus: 'Económico', empresa: 'Sur Continental', asiento: '9', salidaMs: salidaMsDe(fechaLocal(new Date(ahoraMs + 6 * MS_DIA)), '07:30'), estado: 'CANCELADO', etiqueta: 'No vigente · cancelado', pasajero: 'Pasajero de prueba' },
    { idPasaje: 'PSJ-1007', numero: 1007, origen: 'Chiclayo', destino: 'Trujillo', tipoBus: 'Semi cama', empresa: 'Costa Norte', asiento: '18', salidaMs: salidaMsDe(fechaLocal(new Date(ahoraMs + 4 * MS_DIA)), '13:00'), estado: 'VIGENTE', etiqueta: 'De otro cliente', pasajero: 'Otro cliente', idClienteDueno: ID_CLIENTE_AJENO },
  ]
  const pasajes = new Map(base.map((datos) => [datos.idPasaje, crearPasaje(datos, ahoraMs, idCliente)]))
  const salidaMs = salidaMsDe('2026-11-21', '19:30')
  const pasajeros = ['Lucas Leonardo Muñoz Wong', 'Fátima del Carmen Muñoz Wong', 'Karina Jacqueline Aguilar Zavaleta']
  const asientos = ['4A', '4B', '5B']
  IDS_COMPRA_DEMO.forEach((idPasaje, indice) => {
    const pasaje = crearPasaje({
      idPasaje, numero: 2001 + indice, origen: 'Trujillo', destino: 'Lima',
      tipoBus: 'Semi cama', empresa: 'RutaLibre Express', asiento: asientos[indice],
      salidaMs, estado: 'VIGENTE', etiqueta: 'Compra de 3 boletos', pasajero: pasajeros[indice],
    }, ahoraMs, idCliente)
    pasaje.idVenta = ID_COMPRA_DEMO
    pasaje.codigoCompra = 'RL-C-MOCK-001'
    pasaje.fechaCompra = new Date(ahoraMs - MS_DIA).toISOString()
    pasaje.viajeOriginal = {
      origen: pasaje.origen, destino: pasaje.destino, fechaSalida: pasaje.fechaSalida,
      horaSalida: pasaje.horaSalida, empresa: pasaje.empresa, tipoBus: pasaje.tipoBus,
      asiento: pasaje.asiento,
    }
    pasajes.set(idPasaje, pasaje)
  })
  return pasajes
}

function asegurarAlmacen(idCliente) {
  if (!almacen || clienteAlmacen !== idCliente) {
    almacen = generarPasajes(Date.now(), idCliente)
    clienteAlmacen = idCliente
  }
  return almacen
}

export function listarPasajesMock(idCliente) {
  return [...asegurarAlmacen(idCliente).values()]
}

export function obtenerPasajeMock(idPasaje, idCliente) {
  return asegurarAlmacen(idCliente).get(String(idPasaje)) ?? null
}

export function registrarPasajeExterno(pasaje, idCliente) {
  const lista = asegurarAlmacen(idCliente)
  const clave = String(pasaje.idPasaje)
  if (!lista.has(clave)) lista.set(clave, pasaje)
  return lista.get(clave)
}

export function guardarPasajeMock(pasaje, idCliente) {
  asegurarAlmacen(idCliente).set(String(pasaje.idPasaje), pasaje)
  return pasaje
}

export function esPasajeCompraDemo(pasaje) {
  return pasaje?.idVenta === ID_COMPRA_DEMO
    && pasaje?.codigoCompra === 'RL-C-MOCK-001'
    && IDS_COMPRA_DEMO.includes(String(pasaje.idPasaje))
}

export function obtenerCompraDemo(idCliente) {
  const pasajes = IDS_COMPRA_DEMO.map((id) => obtenerPasajeMock(id, idCliente))
  const primero = pasajes[0]
  const original = primero.viajeOriginal
  const boletos = pasajes.map((pasaje) => ({
    idPasaje: pasaje.idPasaje,
    numeroBoleto: pasaje.numeroBoleto,
    pasajero: pasaje.pasajero,
    asiento: pasaje.asiento,
    precio: pasaje.precioPagado,
    viajeVigente: {
      origen: pasaje.origen, destino: pasaje.destino, fechaSalida: pasaje.fechaSalida,
      horaSalida: pasaje.horaSalida, empresa: pasaje.empresa, tipoBus: pasaje.tipoBus,
    },
    cambio: pasaje.postergado ? {
      anterior: pasaje.viajeOriginal,
      adicionalPagado: pasaje.montoAdicionalPagado,
    } : null,
  }))
  const total = boletos.reduce((suma, boleto) => suma + boleto.precio, 0)
  return {
    idVenta: ID_COMPRA_DEMO, codigoCompra: primero.codigoCompra, estado: 'CONFIRMADA',
    fase: 'PROXIMO', vigente: true, totalConsistente: true, incompleta: false,
    documentoDisponible: true, moneda: 'PEN', fechaCompra: primero.fechaCompra,
    ...original, total, boletos,
    totalPagado: total + boletos.reduce((suma, boleto) => suma + (boleto.cambio?.adicionalPagado ?? 0), 0),
  }
}
