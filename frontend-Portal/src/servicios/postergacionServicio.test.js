import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { REGLAS_POSTERGACION, buscarViajesPostergables, rutasDePostergacion, separarViajesPostergables } from './postergacionServicio.js'

const fetchOriginal = globalThis.fetch
afterEach(() => { globalThis.fetch = fetchOriginal })

const AHORA = Date.UTC(2026, 10, 12, 15, 0)
const HORA = 60 * 60 * 1000
const pasaje = { idPasaje: 1, idViaje: 50, origen: 'Trujillo', destino: 'Lima', precioPagado: 60 }

function viaje(datos) {
  return { origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-13', horaSalida: '08:00', asientosDisponibles: 10, precio: 60, reservable: true, ...datos }
}

test('la postergación solo ofrece la ruta del pasaje original', () => {
  assert.deepEqual(rutasDePostergacion(pasaje), [{ origen: 'Trujillo', destino: 'Lima' }])
  assert.deepEqual(rutasDePostergacion(null), [])
})

test('descarta el viaje original, los que ya salieron, los llenos y los que el servidor cerró', () => {
  const viajes = [
    viaje({ id: 50, salidaMs: AHORA + 10 * HORA }),
    viaje({ id: 51, salidaMs: AHORA - HORA }),
    viaje({ id: 52, salidaMs: AHORA + 5 * HORA, asientosDisponibles: 0 }),
    viaje({ id: 53, salidaMs: AHORA + 6 * HORA, reservable: false }),
    viaje({ id: 55, salidaMs: AHORA + 9 * HORA }),
    viaje({ id: 54, salidaMs: AHORA + 8 * HORA }),
  ]
  const resultado = separarViajesPostergables(pasaje, viajes, AHORA)
  assert.deepEqual(resultado.viajes.map((v) => v.id), [55, 54])
  assert.equal(resultado.sinCupo, 4)
})

test('cada regla de la HU-02 se puede revisar por separado', () => {
  const nombres = REGLAS_POSTERGACION.map((regla) => regla.nombre)
  assert.equal(nombres.length, 4)
  const lleno = viaje({ id: 80, salidaMs: AHORA + HORA, asientosDisponibles: 0 })
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
    return new Response(JSON.stringify([viaje({ id: 70, salidaMs: AHORA + 20 * HORA })]))
  }
  const resultado = await buscarViajesPostergables(pasaje, { origen: 'Trujillo', destino: 'Lima', fecha: '2026-11-13' }, AHORA)
  assert.deepEqual(resultado.viajes.map((v) => v.id), [70])
})

test('un error del servidor no se muestra como "sin viajes"', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(buscarViajesPostergables(pasaje, { origen: 'Trujillo', destino: 'Lima', fecha: '2026-11-13' }, AHORA))
})
