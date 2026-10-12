import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularDesfaseServidor,
  estadoReservaActual,
  esReservable,
  ESTADOS_RESERVA,
} from './estadoReserva.js'

const MIN = 60_000
const SALIDA = Date.parse('2026-10-17T08:00:00-05:00')
const base = {
  estadoReserva: 'DISPONIBLE', salidaMs: SALIDA, limiteReservaMs: SALIDA - 20 * MIN,
  asientosDisponibles: 10, estado: 'disponible',
}

test('hasta salida-20 min (inclusive) sigue disponible', () => {
  assert.equal(estadoReservaActual(base, SALIDA - 21 * MIN), 'DISPONIBLE')
  assert.equal(estadoReservaActual(base, SALIDA - 20 * MIN), 'DISPONIBLE')
})

test('un minuto después del límite la reserva queda cerrada', () => {
  assert.equal(estadoReservaActual(base, SALIDA - 20 * MIN + 1), 'RESERVA_CERRADA')
  assert.equal(estadoReservaActual(base, SALIDA - MIN), 'RESERVA_CERRADA')
})

test('a la hora de salida y después, la salida está realizada', () => {
  assert.equal(estadoReservaActual(base, SALIDA), 'SALIDA_REALIZADA')
  assert.equal(estadoReservaActual(base, SALIDA + 5 * MIN), 'SALIDA_REALIZADA')
})

test('un viaje lleno que ya salió se muestra como salida realizada; lleno antes de salir, como lleno', () => {
  const lleno = { ...base, estadoReserva: 'LLENO', asientosDisponibles: 0 }
  assert.equal(estadoReservaActual(lleno, SALIDA - 3 * 60 * MIN), 'LLENO')
  assert.equal(estadoReservaActual(lleno, SALIDA + MIN), 'SALIDA_REALIZADA')
})

test('un viaje cancelado nunca es reservable', () => {
  const c = { ...base, estadoReserva: 'NO_DISPONIBLE' }
  assert.equal(estadoReservaActual(c, SALIDA - 5 * 60 * MIN), 'NO_DISPONIBLE')
  assert.equal(esReservable(c, 0), false)
})

test('sin campos nuevos se degrada a agotado/disponible', () => {
  assert.equal(estadoReservaActual({ estado: 'agotado' }, 0), ESTADOS_RESERVA.LLENO)
  assert.equal(estadoReservaActual({ estado: 'disponible', asientosDisponibles: 3 }, 0), ESTADOS_RESERVA.DISPONIBLE)
})

test('el desfase usa la hora del servidor, no la del navegador', () => {
  const desfase = calcularDesfaseServidor([{ ahoraServidorMs: 1_000_000 }], 400_000)
  assert.equal(desfase, 600_000)
  assert.equal(calcularDesfaseServidor([], 5), 0)
})
