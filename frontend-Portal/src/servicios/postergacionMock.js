import { RUTAS_MOCK, asientoOcupado, construirMapaAsientos, generarViajes, ocuparAsientoSimulado } from '../mock/postergacion/viajes'
import { guardarPasajeMock } from '../mock/postergacion/pasajes'
import {
  DIFERENCIA_FORZADA_INFERIOR,
  DIFERENCIA_FORZADA_SUPERIOR,
} from '../mock/postergacion/escenarios'
import {
  CODIGOS_RECHAZO,
  aplicarPostergacion,
  compararTarifas,
  esMismoViaje,
  filtrarViajesPostergables,
  mensajeRechazo,
  validarElegibilidad,
  validarViajeNuevo,
} from '../utilidades/postergacion'

export const ESTADOS_PAGO = Object.freeze({
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
  PENDIENTE: 'PENDIENTE',
})

export const CODIGO_ERROR_PROCESAMIENTO = 'ERROR_PROCESAMIENTO'

export class ErrorPostergacion extends Error {
  constructor(codigo, mensaje) {
    super(mensaje ?? mensajeRechazo(codigo))
    this.name = 'ErrorPostergacion'
    this.codigo = codigo
  }
}

const LATENCIAS = { elegibilidad: 700, busqueda: 800, asientos: 650, pago: 1800, confirmacion: 1100 }

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

function copiar(valor) {
  return structuredClone(valor)
}

export function obtenerRutasPostergacion() {
  return RUTAS_MOCK
}

export async function consultarElegibilidad(pasaje, idCliente, ahoraMs = Date.now()) {
  await esperar(LATENCIAS.elegibilidad)
  return validarElegibilidad(pasaje, ahoraMs, idCliente)
}

export async function buscarViajesPostergables(pasaje, criterios, ahoraMs = Date.now()) {
  await esperar(LATENCIAS.busqueda)
  const todos = generarViajes(criterios.origen, criterios.destino, criterios.fecha)
    .filter((viaje) => viaje.salidaMs > ahoraMs && !esMismoViaje(pasaje, viaje))
  const viajes = filtrarViajesPostergables(pasaje, todos, ahoraMs)
  return { viajes: copiar(viajes), sinCupo: todos.length - viajes.length }
}

export function aplicarTarifaDeEscenario(viaje, pasaje, escenario) {
  const original = pasaje.precioPagado
  const precios = {
    igual: original,
    superior: original + DIFERENCIA_FORZADA_SUPERIOR,
    inferior: Math.max(original - DIFERENCIA_FORZADA_INFERIOR, 5),
  }
  const forzado = precios[escenario?.tarifa]
  return forzado === undefined ? viaje : { ...viaje, precio: forzado, tarifaForzada: true }
}

export function calcularComparacion(pasaje, viaje) {
  return compararTarifas(pasaje.precioPagado, viaje.precio)
}

export async function obtenerMapaAsientosPostergacion(viaje, idAsientoSeleccionado = null) {
  await esperar(LATENCIAS.asientos)
  return copiar(construirMapaAsientos(viaje, idAsientoSeleccionado))
}

export function mapaConSeleccion(mapa, idAsientoSeleccionado) {
  const mapaPorPiso = {}
  Object.entries(mapa.mapaPorPiso).forEach(([piso, info]) => {
    mapaPorPiso[piso] = {
      ...info,
      asientos: info.asientos.map((asiento) => ({ ...asiento, esMio: asiento.idAsiento === idAsientoSeleccionado })),
    }
  })
  return { ...mapa, mapaPorPiso }
}

function verificarAsientoDisponible(viaje, asiento, escenario) {
  if (escenario?.asiento === 'se-pierde') {
    ocuparAsientoSimulado(viaje.id, asiento.numero)
    throw new ErrorPostergacion(CODIGOS_RECHAZO.ASIENTO_NO_DISPONIBLE)
  }
  if (asientoOcupado(viaje.id, asiento.numero)) {
    throw new ErrorPostergacion(CODIGOS_RECHAZO.ASIENTO_NO_DISPONIBLE)
  }
}

const MENSAJES_PAGO = {
  RECHAZADO: {
    tarjeta: 'Tu tarjeta fue rechazada por el emisor. Verifica los datos o prueba con otro método.',
    yape: 'Yape no aprobó la operación. Revisa tu saldo o prueba con otro método.',
  },
  PENDIENTE: {
    tarjeta: 'El pago con tarjeta está pendiente de confirmación. Tu pasaje original no se modificó.',
    yape: 'El pago con Yape está pendiente de confirmación. Tu pasaje original no se modificó.',
  },
}

export async function procesarPagoSimulado({ viaje, asiento, monto, metodo, escenario }) {
  await esperar(LATENCIAS.pago)
  verificarAsientoDisponible(viaje, asiento, escenario)
  const referencia = `SIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  switch (escenario?.pago) {
    case 'rechazado':
      return { estado: ESTADOS_PAGO.RECHAZADO, metodo, monto, referencia, mensaje: MENSAJES_PAGO.RECHAZADO[metodo] }
    case 'pendiente':
      return { estado: ESTADOS_PAGO.PENDIENTE, metodo, monto, referencia, mensaje: MENSAJES_PAGO.PENDIENTE[metodo] }
    case 'error':
      throw new ErrorPostergacion(CODIGO_ERROR_PROCESAMIENTO, 'Ocurrió un error al procesar el pago. No se realizó ningún cobro ni se modificó tu pasaje.')
    default:
      return { estado: ESTADOS_PAGO.APROBADO, metodo, monto, referencia, mensaje: 'Pago aprobado.' }
  }
}

export async function confirmarPostergacionSimulada({ pasaje, viaje, asiento, comparacion, idCliente, escenario, pago = null }) {
  await esperar(LATENCIAS.confirmacion)
  const elegibilidad = validarElegibilidad(pasaje, Date.now(), idCliente)
  if (!elegibilidad.elegible) throw new ErrorPostergacion(elegibilidad.codigo, elegibilidad.mensaje)
  const viajeValido = validarViajeNuevo(pasaje, viaje, Date.now())
  if (!viajeValido.valido) throw new ErrorPostergacion(viajeValido.codigo, viajeValido.mensaje)
  if (comparacion.requierePago && pago?.estado !== ESTADOS_PAGO.APROBADO) {
    throw new ErrorPostergacion(CODIGO_ERROR_PROCESAMIENTO, 'No se puede confirmar sin un pago aprobado. Tu pasaje original no fue modificado.')
  }
  if (!pago) verificarAsientoDisponible(viaje, asiento, escenario)
  else if (asientoOcupado(viaje.id, asiento.numero)) throw new ErrorPostergacion(CODIGOS_RECHAZO.ASIENTO_NO_DISPONIBLE)

  const actualizado = aplicarPostergacion(pasaje, viaje, asiento, comparacion.montoAPagar)
  guardarPasajeMock(actualizado, idCliente)
  ocuparAsientoSimulado(viaje.id, asiento.numero)
  return { pasaje: copiar(actualizado), pago: pago ? copiar(pago) : null }
}
