import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  cambiarAsientoElegido,
  cerrarReserva,
  esAsientoTomado,
  esSesionVencida,
  liberarAsientoPropio,
} from './reprogramacionAsientosServicio.js'

const fetchOriginal = globalThis.fetch
afterEach(() => { globalThis.fetch = fetchOriginal })

// Simula el backend: guarda las llamadas y responde según el diccionario de estados.
function simularBackend(estadosPorAccion = {}) {
  const llamadas = []
  globalThis.fetch = async (url) => {
    const [, idAsiento, accion] = new URL(url).pathname.match(/asientos\/(\d+)\/(\w+)$/)
    llamadas.push(`${accion}:${idAsiento}`)
    const estado = estadosPorAccion[`${accion}:${idAsiento}`] ?? (accion === 'liberar' ? 204 : 200)
    if (estado === 204) return new Response(null, { status: 204 })
    const cuerpo = estado === 200 ? { numero: '5', estado: 'BLOQUEADO' } : { mensaje: 'Error de prueba' }
    return new Response(JSON.stringify(cuerpo), { status: estado })
  }
  return llamadas
}

test('cambiar de asiento bloquea el nuevo y después libera el anterior', async () => {
  const llamadas = simularBackend()
  await cambiarAsientoElegido(10, 'token', [4], 5)
  assert.deepEqual(llamadas, ['bloquear:5', 'liberar:4'])
})

test('si había más de un asiento mío, se liberan todos', async () => {
  const llamadas = simularBackend()
  await cambiarAsientoElegido(10, 'token', [3, 4], 5)
  assert.deepEqual(llamadas, ['bloquear:5', 'liberar:3', 'liberar:4'])
})

test('la primera elección solo bloquea (no hay nada que liberar)', async () => {
  const llamadas = simularBackend()
  await cambiarAsientoElegido(10, 'token', [], 5)
  assert.deepEqual(llamadas, ['bloquear:5'])
})

test('si el nuevo asiento está tomado, falla y el anterior no se libera', async () => {
  const llamadas = simularBackend({ 'bloquear:5': 409 })
  await assert.rejects(cambiarAsientoElegido(10, 'token', [4], 5), (error) => esAsientoTomado(error))
  assert.deepEqual(llamadas, ['bloquear:5'])
})

test('liberar un asiento que ya no era mío (409) no es un error', async () => {
  simularBackend({ 'liberar:4': 409 })
  await liberarAsientoPropio(10, 'token', 4)
  await cambiarAsientoElegido(10, 'token', [4], 5)
})

test('si liberar falla por otro motivo (sesión vencida), el error se propaga', async () => {
  simularBackend({ 'liberar:4': 410 })
  await assert.rejects(cambiarAsientoElegido(10, 'token', [4], 5), (error) => esSesionVencida(error))
})

test('cerrarReserva libera el asiento y nunca lanza error', async () => {
  const llamadas = simularBackend({ 'liberar:4': 410 })
  await cerrarReserva(10, 'token', 4)
  assert.deepEqual(llamadas, ['liberar:4'])
  await cerrarReserva(10, 'token', null)
  assert.deepEqual(llamadas, ['liberar:4'])
})

test('401 y 410 son sesión vencida; 409 es asiento tomado', () => {
  assert.equal(esSesionVencida({ status: 410 }), true)
  assert.equal(esSesionVencida({ status: 401 }), true)
  assert.equal(esSesionVencida({ status: 409 }), false)
  assert.equal(esAsientoTomado({ status: 409 }), true)
  assert.equal(esAsientoTomado(new Error('sin status')), false)
})
