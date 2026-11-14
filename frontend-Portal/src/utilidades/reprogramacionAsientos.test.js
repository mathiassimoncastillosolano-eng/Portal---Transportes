import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aplicarEventoEnMapa,
  buscarAsientoElegido,
  calcularTarifaDelAsiento,
  buscarIdsAsientosElegidos,
  describirTarifaLateral,
  viajeParaMostrar,
} from './reprogramacionAsientos.js'

function crearMapa() {
  return {
    pisos: 2,
    mapaPorPiso: {
      1: { piso: 1, asientos: [
        { idAsiento: 1, numero: '1', piso: 1, estado: 'disponible', esMio: false, precio: 60 },
        { idAsiento: 2, numero: '2', piso: 1, estado: 'bloqueado', esMio: true, precio: 70 },
      ] },
      2: { piso: 2, asientos: [
        { idAsiento: 3, numero: '21', piso: 2, estado: 'ocupado', esMio: false, precio: 90 },
      ] },
    },
  }
}

const pasaje = { precioPagado: 70, moneda: 'PEN' }

test('buscarAsientoElegido devuelve el asiento esMio y null si no hay ninguno', () => {
  assert.equal(buscarAsientoElegido(crearMapa()).idAsiento, 2)
  const sinMios = aplicarEventoEnMapa(crearMapa(), { idAsiento: 2, estado: 'disponible' })
  assert.equal(buscarAsientoElegido(sinMios), null)
  assert.equal(buscarAsientoElegido(null), null)
})

test('buscarIdsAsientosElegidos lista todos los asientos míos', () => {
  assert.deepEqual(buscarIdsAsientosElegidos(crearMapa()), [2])
  assert.deepEqual(buscarIdsAsientosElegidos(null), [])
})

test('aplicarEventoEnMapa: liberar quita lo mío; otros estados conservan esMio', () => {
  const liberado = aplicarEventoEnMapa(crearMapa(), { idAsiento: 2, estado: 'disponible' })
  assert.equal(liberado.mapaPorPiso[1].asientos[1].esMio, false)
  const ocupadoPorOtro = aplicarEventoEnMapa(crearMapa(), { idAsiento: 1, estado: 'bloqueado' })
  assert.equal(ocupadoPorOtro.mapaPorPiso[1].asientos[0].estado, 'bloqueado')
  assert.equal(ocupadoPorOtro.mapaPorPiso[1].asientos[0].esMio, false)
})

test('aplicarEventoEnMapa ignora asientos que no existen', () => {
  const mapa = crearMapa()
  assert.equal(aplicarEventoEnMapa(mapa, { idAsiento: 99, estado: 'ocupado' }), mapa)
})

test('la tarifa usa el precio del asiento elegido y no el "desde" del viaje', () => {
  const caro = calcularTarifaDelAsiento(pasaje, { precio: 90 })
  assert.equal(caro.escenario, 'SUPERIOR')
  assert.equal(caro.montoAPagar, 20)
  const igual = calcularTarifaDelAsiento(pasaje, { precio: 70 })
  assert.equal(igual.escenario, 'IGUAL')
  const barato = calcularTarifaDelAsiento(pasaje, { precio: 55 })
  assert.equal(barato.escenario, 'INFERIOR')
  assert.equal(barato.montoAPagar, 0)
})

test('sin asiento o sin precio no hay tarifa', () => {
  assert.equal(calcularTarifaDelAsiento(pasaje, null), null)
  assert.equal(calcularTarifaDelAsiento(pasaje, { precio: undefined }), null)
})

test('describirTarifaLateral explica si paga más, nada o le sobra', () => {
  const masCaro = describirTarifaLateral(calcularTarifaDelAsiento(pasaje, { precio: 90 }), 'PEN')
  assert.equal(masCaro.montoDiferencia, 20)
  assert.match(masCaro.ayuda, /Pagarás solo la diferencia de S\/ 20\.00/)

  const igual = describirTarifaLateral(calcularTarifaDelAsiento(pasaje, { precio: 70 }), 'PEN')
  assert.equal(igual.montoDiferencia, 0)
  assert.match(igual.ayuda, /No pagas nada: la tarifa es igual/)

  const sobra = describirTarifaLateral(calcularTarifaDelAsiento(pasaje, { precio: 55 }), 'PEN')
  assert.equal(sobra.montoDiferencia, 15)
  assert.match(sobra.ayuda, /No pagas nada\. La diferencia de S\/ 15\.00 no se devuelve/)
})

test('describirTarifaLateral sin tarifa pide elegir un asiento', () => {
  const textos = describirTarifaLateral(null, 'PEN')
  assert.equal(textos.montoDiferencia, null)
  assert.match(textos.ayuda, /Elige un asiento/)
})

test('viajeParaMostrar reemplaza la llegada y duración que el backend no calculó', () => {
  const viaje = viajeParaMostrar({ horaSalida: '10:00', horaLlegada: null, duracion: undefined })
  assert.equal(viaje.horaLlegada, 'Por confirmar')
  assert.equal(viaje.duracion, 'Por confirmar')
  assert.equal(viajeParaMostrar({ horaLlegada: '18:00', duracion: '8 h' }).horaLlegada, '18:00')
})
