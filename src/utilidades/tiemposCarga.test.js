import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TIEMPOS_NORMALES,
  TIEMPOS_REDUCIDOS,
  duracionMinimaTotal,
  elegirTiempos,
  esperaParaLlegar,
  secuenciaDeCierre,
} from './tiemposCarga.js'

test('una respuesta rápida espera lo que falta del recorrido (sin destellos)', () => {
  assert.equal(esperaParaLlegar({ transcurrido: 80 }), TIEMPOS_NORMALES.recorrido - 80)
  assert.equal(esperaParaLlegar({ transcurrido: 0 }), TIEMPOS_NORMALES.recorrido)
})

test('una respuesta lenta no se retrasa artificialmente', () => {
  assert.equal(esperaParaLlegar({ transcurrido: TIEMPOS_NORMALES.recorrido }), 0)
  assert.equal(esperaParaLlegar({ transcurrido: 9000 }), 0)
})

test('un tiempo transcurrido negativo se trata como cero', () => {
  assert.equal(esperaParaLlegar({ transcurrido: -50 }), TIEMPOS_NORMALES.recorrido)
})

test('un error usa un mínimo menor que el del viaje completo', () => {
  assert.equal(esperaParaLlegar({ transcurrido: 100, falla: true }), TIEMPOS_NORMALES.minimoFalla - 100)
  assert.ok(TIEMPOS_NORMALES.minimoFalla < TIEMPOS_NORMALES.recorrido)
  assert.equal(esperaParaLlegar({ transcurrido: 800, falla: true }), 0)
})

test('el cierre exitoso confirma el destino y luego sale; el error no confirma', () => {
  assert.deepEqual(
    secuenciaDeCierre({ tiempos: TIEMPOS_NORMALES }).map((paso) => paso.fase),
    ['llegada', 'saliendo'],
  )
  assert.deepEqual(
    secuenciaDeCierre({ falla: true, tiempos: TIEMPOS_NORMALES }).map((paso) => paso.fase),
    ['saliendo'],
  )
})

test('la transición de salida es breve (250–450 ms) y el total ronda los 2 s', () => {
  assert.ok(TIEMPOS_NORMALES.salida >= 250 && TIEMPOS_NORMALES.salida <= 450)
  const total = duracionMinimaTotal(TIEMPOS_NORMALES)
  assert.ok(total >= 1800 && total <= 2400, `total inesperado: ${total}`)
})

test('con movimiento reducido los tiempos son más cortos', () => {
  assert.equal(elegirTiempos(true), TIEMPOS_REDUCIDOS)
  assert.equal(elegirTiempos(false), TIEMPOS_NORMALES)
  assert.ok(duracionMinimaTotal(TIEMPOS_REDUCIDOS) < duracionMinimaTotal(TIEMPOS_NORMALES))
})
