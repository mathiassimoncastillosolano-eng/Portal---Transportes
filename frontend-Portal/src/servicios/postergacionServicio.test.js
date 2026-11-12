import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  REGLAS_POSTERGACION,
  buscarViajesPostergables,
  esElViajeDelPasaje,
  fechaInicialDeBusqueda,
  rutasDePostergacion,
  salidaOriginalMs,
  separarViajesPostergables,
} from './postergacionServicio.js'

const fetchOriginal = globalThis.fetch
afterEach(() => { globalThis.fetch = fetchOriginal })

const HORA = 60 * 60 * 1000
// Pasaje original: Trujillo → Lima, viernes 13 de noviembre a las 08:00.
const pasaje = { idPasaje: 1, idViaje: 50, origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-13', horaSalida: '08:00', precioPagado: 60 }
// Las horas se calculan desde la salida original para que la prueba no dependa de la zona horaria.
const ORIGINAL = salidaOriginalMs(pasaje)
const AHORA = ORIGINAL - 20 * HORA

function viaje(datos) {
  return { origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-13', horaSalida: '08:00', asientosDisponibles: 10, precio: 60, reservable: true, ...datos }
}

test('la postergación solo ofrece la ruta del pasaje original', () => {
  assert.deepEqual(rutasDePostergacion(pasaje), [{ origen: 'Trujillo', destino: 'Lima' }])
  assert.deepEqual(rutasDePostergacion(null), [])
})

test('descarta el viaje original, los que ya salieron, los llenos y los que el servidor cerró', () => {
  const viajes = [
    viaje({ id: 50, salidaMs: ORIGINAL }),
    viaje({ id: 51, salidaMs: AHORA - HORA }),
    viaje({ id: 52, salidaMs: ORIGINAL + 5 * HORA, asientosDisponibles: 0 }),
    viaje({ id: 53, salidaMs: ORIGINAL + 6 * HORA, reservable: false }),
    viaje({ id: 55, salidaMs: ORIGINAL + 9 * HORA }),
    viaje({ id: 54, salidaMs: ORIGINAL + 8 * HORA }),
  ]
  const resultado = separarViajesPostergables(pasaje, viajes, AHORA)
  assert.deepEqual(resultado.viajes.map((v) => v.id), [55, 54])
  assert.equal(resultado.sinCupo, 4)
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
  const resultado = separarViajesPostergables(pasaje, viajes, AHORA)
  assert.deepEqual(resultado.viajes.map((v) => v.id), [60, 61, 62, 63])
})

test('regla de 6 h en el viaje nuevo: con 6 h exactas se ofrece, con menos no', () => {
  const viajes = [
    viaje({ id: 70, salidaMs: AHORA + 6 * HORA }),
    viaje({ id: 71, salidaMs: AHORA + 6 * HORA - 1 }),
    viaje({ id: 72, salidaMs: AHORA + 2 * HORA }),
  ]
  const resultado = separarViajesPostergables(pasaje, viajes, AHORA)
  assert.deepEqual(resultado.viajes.map((v) => v.id), [70])
  assert.equal(resultado.sinCupo, 2)
})

test('regla de 6 h en el viaje original: con exactamente 6 h se puede, con menos ya no se ofrece ningún viaje', () => {
  const otro = [viaje({ id: 90, salidaMs: ORIGINAL + 10 * HORA })]
  assert.equal(separarViajesPostergables(pasaje, otro, ORIGINAL - 6 * HORA).viajes.length, 1)
  assert.equal(separarViajesPostergables(pasaje, otro, ORIGINAL - 6 * HORA + 1).viajes.length, 0)
})

test('la búsqueda se abre en el día del viaje original', () => {
  assert.equal(fechaInicialDeBusqueda(pasaje, '2026-11-12'), '2026-11-13')
  assert.equal(fechaInicialDeBusqueda(pasaje, '2026-11-13'), '2026-11-13')
  assert.equal(fechaInicialDeBusqueda(pasaje, '2026-11-14'), '2026-11-14')
})

test('sin id del viaje, reconoce el viaje comprado por fecha, hora y tipo de bus', () => {
  // La compra del perfil no envía idViaje: así llega el pasaje real.
  const pasajeReal = { ...pasaje, idViaje: undefined, fechaSalida: '2026-11-16', horaSalida: '08:00', tipoBus: 'Estándar' }
  const mismo = viaje({ id: 900, fechaSalida: '2026-11-16', horaSalida: '08:00', tipoBus: 'Estándar' })
  const otroTipo = viaje({ id: 901, fechaSalida: '2026-11-16', horaSalida: '08:00', tipoBus: 'Semi Cama' })
  const otraHora = viaje({ id: 902, fechaSalida: '2026-11-16', horaSalida: '11:00', tipoBus: 'Estándar' })
  assert.equal(esElViajeDelPasaje(mismo, pasajeReal), true)
  assert.equal(esElViajeDelPasaje(otroTipo, pasajeReal), false)
  assert.equal(esElViajeDelPasaje(otraHora, pasajeReal), false)
  const salida = salidaOriginalMs(pasajeReal)
  const ofrecidos = separarViajesPostergables(pasajeReal, [
    { ...mismo, salidaMs: salida },
    { ...otraHora, salidaMs: salida + 3 * HORA },
  ], salida - 20 * HORA)
  assert.deepEqual(ofrecidos.viajes.map((v) => v.id), [902])
})
