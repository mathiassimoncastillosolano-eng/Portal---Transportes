import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { buscarViajes } from './viajesServicio.js'

const fetchOriginal = globalThis.fetch
afterEach(() => { globalThis.fetch = fetchOriginal })

test('envía fecha y horario a la API pública conservando identificadores y valores reales', async () => {
  const viajes = [{ id: 10, fechaSalida: '2026-09-23', horaSalida: '07:30', asientosDisponibles: 36, precio: 110 }]
  globalThis.fetch = async (url, opciones) => {
    const consulta = new URL(url)
    assert.equal(consulta.pathname, '/api/viajes/buscar')
    assert.equal(consulta.searchParams.get('origen'), 'Lima')
    assert.equal(consulta.searchParams.get('destino'), 'Cusco')
    assert.equal(consulta.searchParams.get('fecha'), '2026-09-23')
    assert.equal(consulta.searchParams.get('horario'), 'mañana')
    assert.equal(opciones.headers.Authorization, undefined)
    return new Response(JSON.stringify(viajes))
  }
  assert.deepEqual(await buscarViajes({ origen: ' Lima ', destino: 'Cusco', fecha: '2026-09-23', horario: 'mañana' }), viajes)
})

test('no genera viajes ficticios cuando la búsqueda devuelve vacío', async () => {
  globalThis.fetch = async () => new Response('[]')
  assert.deepEqual(await buscarViajes({ origen: 'Lima', destino: 'Cusco', fecha: '2026-09-24' }), [])
})

test('muestra errores de API y rechaza entradas incompletas sin consultar', async () => {
  globalThis.fetch = async () => { throw new Error('No debe consultar') }
  await assert.rejects(buscarViajes({ origen: 'Lima', destino: 'Cusco' }), /obligatorios/)
  globalThis.fetch = async () => new Response(JSON.stringify({ mensaje: 'Horario no válido.' }), { status: 400 })
  await assert.rejects(buscarViajes({ origen: 'Lima', destino: 'Cusco', fecha: '2026-09-23' }), /Horario no válido/)
})

test('errores de conexión y respuestas inválidas no se confunden con cero viajes', async () => {
  const criterios = { origen: 'Lima', destino: 'Cusco', fecha: '2026-09-23' }
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(buscarViajes(criterios), /conectar con el servidor/)
  globalThis.fetch = async () => new Response('<html>Error</html>')
  await assert.rejects(buscarViajes(criterios), /respuesta de viajes no válida/)
})
