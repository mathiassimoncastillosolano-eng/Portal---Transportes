import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  REGLAS_POSTERGACION,
  buscarViajesPostergables,
  esMismaSalida,
  salidaOriginalMs,
  esViajePostergable,
  prepararViajesPostergables,
} from './postergacionServicio.js'
import { fechaLocal } from '../utilidades/fechas.js'

const fetchOriginal = globalThis.fetch
const almacenOriginal = globalThis.localStorage
afterEach(() => {
  globalThis.fetch = fetchOriginal
  if (almacenOriginal === undefined) delete globalThis.localStorage
  else globalThis.localStorage = almacenOriginal
})

// Sesión simulada: el endpoint de postergación exige el token del cliente.
function conSesion() {
  globalThis.localStorage = { getItem: () => 'token-prueba', setItem() {}, removeItem() {} }
}

const HORA = 60 * 60 * 1000
// Pasaje original: Trujillo → Lima, viernes 13 de noviembre a las 08:00.
const pasaje = { idPasaje: 1, idViaje: 50, origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-13', horaSalida: '08:00', precioPagado: 60 }
// Las horas se calculan desde la salida original para que la prueba no dependa de la zona horaria.
const ORIGINAL = salidaOriginalMs(pasaje)
const AHORA = ORIGINAL - 20 * HORA

// Arma un viaje de prueba. La fecha y la hora se calculan desde salidaMs,
// igual que las envía la API.
function viaje(datos) {
  const salida = new Date(datos.salidaMs ?? ORIGINAL)
  const fechaSalida = fechaLocal(salida)
  const horaSalida = `${String(salida.getHours()).padStart(2, '0')}:${String(salida.getMinutes()).padStart(2, '0')}`
  return { origen: 'Trujillo', destino: 'Lima', fechaSalida, horaSalida, asientosDisponibles: 10, precio: 60, reservable: true, ...datos }
}

test('muestra todos los viajes menos el original; solo se pueden elegir los abiertos con asientos', () => {
  const viajes = [
    viaje({ id: 50, salidaMs: ORIGINAL }),
    viaje({ id: 51, salidaMs: AHORA - HORA }),
    viaje({ id: 52, salidaMs: ORIGINAL + 5 * HORA, asientosDisponibles: 0 }),
    viaje({ id: 53, salidaMs: ORIGINAL + 6 * HORA, reservable: false }),
    viaje({ id: 55, salidaMs: ORIGINAL + 9 * HORA }),
    viaje({ id: 54, salidaMs: ORIGINAL + 8 * HORA }),
  ]
  const resultado = prepararViajesPostergables(pasaje, viajes, AHORA)
  assert.deepEqual(resultado.viajes.map((v) => v.id), [51, 52, 53, 55, 54])
  assert.equal(resultado.ocultos, 1)
  const elegibles = resultado.viajes.filter((v) => esViajePostergable(v, pasaje, AHORA))
  assert.deepEqual(elegibles.map((v) => v.id), [55, 54])
})

test('cada regla de la HU-02 se puede revisar por separado', () => {
  const nombres = REGLAS_POSTERGACION.map((regla) => regla.nombre)
  assert.equal(nombres.length, 5)
  const lleno = viaje({ id: 80, salidaMs: ORIGINAL + HORA, asientosDisponibles: 0 })
  const fallidas = REGLAS_POSTERGACION.filter((regla) => !regla.cumple(lleno, pasaje, AHORA))
  assert.deepEqual(fallidas.map((regla) => regla.nombre), ['Tiene asientos disponibles'])
})

test('consulta la API real con la ruta y la fecha elegidas', async () => {
  globalThis.fetch = async (url) => {
    const consulta = new URL(url)
    assert.equal(consulta.pathname, '/api/viajes/buscar')
    assert.equal(consulta.searchParams.get('origen'), 'Trujillo')
    assert.equal(consulta.searchParams.get('destino'), 'Lima')
    assert.equal(consulta.searchParams.get('fecha'), '2026-11-13')
    return new Response(JSON.stringify([viaje({ id: 70, salidaMs: ORIGINAL + 20 * HORA })]))
  }
  const resultado = await buscarViajesPostergables(pasaje, { origen: 'Trujillo', destino: 'Lima', fecha: '2026-11-13' }, AHORA)
  assert.deepEqual(resultado.viajes.map((v) => v.id), [70])
})

test('un error del servidor no se muestra como "sin viajes"', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(buscarViajesPostergables(pasaje, { origen: 'Trujillo', destino: 'Lima', fecha: '2026-11-13' }, AHORA))
})

test('permite adelantar o postergar: ofrece salidas antes y después del viaje original', () => {
  const viajes = [
    viaje({ id: 60, salidaMs: ORIGINAL - 2 * HORA }), // mismo día, más temprano: adelantar
    viaje({ id: 61, salidaMs: ORIGINAL - 12 * HORA }), // el día anterior: adelantar
    viaje({ id: 62, salidaMs: ORIGINAL + 3 * HORA }), // mismo día, más tarde: postergar
    viaje({ id: 63, salidaMs: ORIGINAL + 48 * HORA }), // dos días después: postergar
  ]
  const resultado = prepararViajesPostergables(pasaje, viajes, AHORA)
  assert.deepEqual(resultado.viajes.filter((v) => esViajePostergable(v, pasaje, AHORA)).map((v) => v.id), [60, 61, 62, 63])
})

test('el viaje nuevo NO necesita 6 h: se puede elegir aunque salga pronto, si todavía no salió', () => {
  const viajes = [
    viaje({ id: 70, salidaMs: AHORA + 2 * HORA }), // sale en 2 h: se ofrece (adelantar)
    viaje({ id: 71, salidaMs: AHORA + 30 * 60 * 1000 }), // sale en 30 min: se ofrece
    viaje({ id: 72, salidaMs: AHORA - 60 * 1000 }), // ya salió: se muestra, pero no se puede elegir
  ]
  const resultado = prepararViajesPostergables(pasaje, viajes, AHORA)
  assert.deepEqual(resultado.viajes.map((v) => v.id), [70, 71, 72])
  assert.deepEqual(resultado.viajes.filter((v) => esViajePostergable(v, pasaje, AHORA)).map((v) => v.id), [70, 71])
})

test('regla de 6 h en el viaje original: con exactamente 6 h se puede, con menos se rechaza con el motivo', () => {
  const otro = [viaje({ id: 90, salidaMs: ORIGINAL + 10 * HORA })]
  assert.equal(prepararViajesPostergables(pasaje, otro, ORIGINAL - 6 * HORA).viajes.length, 1)
  assert.throws(
    () => prepararViajesPostergables(pasaje, otro, ORIGINAL - 6 * HORA + 1),
    (error) => error.status === 409 && error.message === 'Solo puedes cambiar tu pasaje hasta 6 horas antes de la salida.',
  )
})

test('no ofrece ninguna salida con la misma fecha y hora del pasaje, aunque sea otro tipo de bus', () => {
  // La compra del perfil no envía idViaje: así llega el pasaje real.
  const pasajeReal = { ...pasaje, idViaje: undefined, fechaSalida: '2026-11-16', horaSalida: '08:00', tipoBus: 'Estándar' }
  const mismo = viaje({ id: 900, fechaSalida: '2026-11-16', horaSalida: '08:00', tipoBus: 'Estándar' })
  const otroTipo = viaje({ id: 901, fechaSalida: '2026-11-16', horaSalida: '08:00', tipoBus: 'Semi Cama' })
  const otraHora = viaje({ id: 902, fechaSalida: '2026-11-16', horaSalida: '11:00', tipoBus: 'Estándar' })
  const otroDia = viaje({ id: 903, fechaSalida: '2026-11-17', horaSalida: '08:00', tipoBus: 'Estándar' })
  assert.equal(esMismaSalida(mismo, pasajeReal), true)
  assert.equal(esMismaSalida(otroTipo, pasajeReal), true)
  assert.equal(esMismaSalida(otraHora, pasajeReal), false)
  assert.equal(esMismaSalida(otroDia, pasajeReal), false)
  const salida = salidaOriginalMs(pasajeReal)
  const ofrecidos = prepararViajesPostergables(pasajeReal, [
    { ...mismo, salidaMs: salida },
    { ...otroTipo, salidaMs: salida },
    { ...otraHora, salidaMs: salida + 3 * HORA },
    { ...otroDia, salidaMs: salida + 24 * HORA },
  ], salida - 20 * HORA)
  assert.deepEqual(ofrecidos.viajes.map((v) => v.id), [902, 903])
})

test('permite cambiar de destino incluso si la nueva salida tiene la misma fecha y hora', () => {
  const nuevaRuta = viaje({ id: 95, origen: 'Trujillo', destino: 'Cajamarca', salidaMs: ORIGINAL })
  assert.equal(esMismaSalida(nuevaRuta, pasaje), false)
  assert.deepEqual(prepararViajesPostergables(pasaje, [nuevaRuta], AHORA).viajes.map((v) => v.id), [95])
})

test('consulta la API con el origen y destino que eligió el cliente', async () => {
  globalThis.fetch = async (url) => {
    const consulta = new URL(url)
    assert.equal(consulta.searchParams.get('origen'), 'Lima')
    assert.equal(consulta.searchParams.get('destino'), 'Piura')
    return new Response(JSON.stringify([viaje({ id: 96, origen: 'Lima', destino: 'Piura', salidaMs: ORIGINAL + HORA })]))
  }
  const resultado = await buscarViajesPostergables(pasaje, { origen: 'Lima', destino: 'Piura', fecha: '2026-11-13' }, AHORA)
  assert.deepEqual(resultado.viajes.map((v) => v.id), [96])
})

test('un pasaje real consulta el endpoint de postergación con su id', async () => {
  const real = { ...pasaje, idPasaje: 26, deCompraReal: true }
  conSesion()
  globalThis.fetch = async (url, opciones) => {
    assert.equal(opciones.headers.Authorization, 'Bearer token-prueba')
    const consulta = new URL(url)
    assert.equal(consulta.pathname, '/api/usuarios/postergaciones/26/viajes')
    assert.equal(consulta.searchParams.get('origen'), 'Trujillo')
    assert.equal(consulta.searchParams.get('destino'), 'Lima')
    assert.equal(consulta.searchParams.get('fecha'), '2026-11-13')
    return new Response(JSON.stringify({ viajes: [viaje({ id: 71, salidaMs: ORIGINAL + 20 * HORA })], ocultos: 1 }))
  }
  const resultado = await buscarViajesPostergables(real, { origen: 'Trujillo', destino: 'Lima', fecha: '2026-11-13' }, AHORA)
  assert.deepEqual(resultado.viajes.map((v) => v.id), [71])
  assert.equal(resultado.ocultos, 1)
})

test('si el servidor rechaza el cambio, el error trae el motivo', async () => {
  const real = { ...pasaje, deCompraReal: true }
  conSesion()
  const motivo = 'Solo puedes cambiar tu pasaje hasta 6 horas antes de la salida.'
  globalThis.fetch = async () => new Response(JSON.stringify({ mensaje: motivo }), { status: 409 })
  await assert.rejects(
    buscarViajesPostergables(real, { origen: 'Trujillo', destino: 'Lima', fecha: '2026-11-13' }, AHORA),
    (error) => error.status === 409 && error.message === motivo,
  )
})
