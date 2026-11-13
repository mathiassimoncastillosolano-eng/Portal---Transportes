import test from 'node:test'
import assert from 'node:assert/strict'
import { filtrarViajes } from './filtrarViajes.js'

const viajes = [
  { id: 0, horaSalida: '00:00', tipoBus: 'Estándar' },
  { id: 1, horaSalida: '05:59', tipoBus: 'Estándar' },
  { id: 2, horaSalida: '06:00', tipoBus: 'Semi Cama' },
  { id: 3, horaSalida: '11:59', tipoBus: 'Bus Cama' },
  { id: 4, horaSalida: '12:00', tipoBus: 'Prime' },
  { id: 5, horaSalida: '18:59', tipoBus: 'Semi Cama' },
  { id: 6, horaSalida: '19:00', tipoBus: 'Estándar' },
  { id: 7, horaSalida: '23:59', tipoBus: 'Prime' },
]

test('cada franja incluye sus límites y excluye la siguiente', () => {
  const ids = (horario) => filtrarViajes(viajes, horario, new Set()).map((viaje) => viaje.id)
  assert.deepEqual(ids('madrugada'), [0, 1])
  assert.deepEqual(ids('mañana'), [2, 3])
  assert.deepEqual(ids('tarde'), [4, 5])
  assert.deepEqual(ids('noche'), [6, 7])
  assert.deepEqual(ids('cualquiera'), [0, 1, 2, 3, 4, 5, 6, 7])
})

test('combina hora y servicios; sin servicios seleccionados muestra todos', () => {
  assert.deepEqual(
    filtrarViajes(viajes, 'tarde', new Set(['Semi Cama'])).map((viaje) => viaje.id),
    [5],
  )
  assert.deepEqual(
    filtrarViajes(viajes, 'cualquiera', new Set(['Estándar', 'Prime'])).map((viaje) => viaje.id),
    [0, 1, 4, 6, 7],
  )
  assert.equal(filtrarViajes(viajes, 'mañana', new Set(['Prime'])).length, 0)
})
