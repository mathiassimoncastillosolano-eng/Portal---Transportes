import test from 'node:test'
import assert from 'node:assert/strict'
import {
  esFalloTransitorio,
  esperarResultadoPago,
  iniciarPago,
  nuevaClaveIdempotencia,
} from './pagosServicio.js'

const solicitud = { idViaje: 1, tokenSesion: 't', claveIdempotencia: 'clave-1234567890ab', medioPago: 'TARJETA', token: 'x' }
const sinDormir = async () => {}

test('iniciarPago reenvía la MISMA solicitud (misma clave) si se perdió la respuesta', async () => {
  const cuerpos = []
  let llamadas = 0
  const enviar = async (ruta, opciones) => {
    llamadas += 1
    cuerpos.push(opciones.body)
    assert.equal(ruta, '/api/pagos')
    assert.equal(opciones.method, 'POST')
    if (llamadas === 1) throw Object.assign(new Error('timeout'), { sinRespuesta: true })
    if (llamadas === 2) throw Object.assign(new Error('Render despertando'), { status: 503 })
    return { referencia: 'RL-1', estado: 'EN_PROCESO' }
  }
  const r = await iniciarPago(solicitud, { enviar, dormir: sinDormir })
  assert.equal(r.referencia, 'RL-1')
  assert.equal(llamadas, 3)
  assert.equal(new Set(cuerpos).size, 1, 'los tres envíos son idénticos')
})

test('iniciarPago no reintenta errores definitivos (400, 409)', async () => {
  for (const status of [400, 409]) {
    let llamadas = 0
    const enviar = async () => {
      llamadas += 1
      throw Object.assign(new Error('x'), { status })
    }
    await assert.rejects(iniciarPago(solicitud, { enviar, dormir: sinDormir }), (e) => e.status === status)
    assert.equal(llamadas, 1)
  }
})

test('iniciarPago rechaza solicitudes con importe (el total lo calcula el servidor)', async () => {
  await assert.rejects(iniciarPago({ ...solicitud, monto: 1 }, { enviar: async () => ({}) }))
  await assert.rejects(iniciarPago({ ...solicitud, transaction_amount: 1 }, { enviar: async () => ({}) }))
})

test('esperarResultadoPago sigue consultando mientras el estado está activo y para en el final', async () => {
  const estados = ['CREANDO', 'EN_PROCESO', 'EN_PROCESO', 'APROBADO']
  const vistos = []
  let i = 0
  const { respuesta, agotado } = await esperarResultadoPago('RL-1', {
    consultar: async () => ({ estado: estados[i++] }),
    alActualizar: (r) => vistos.push(r.estado),
    dormir: sinDormir,
  })
  assert.equal(respuesta.estado, 'APROBADO')
  assert.equal(agotado, false)
  assert.deepEqual(vistos, estados)
})

test('esperarResultadoPago tolera errores de red y devuelve "agotado" sin inventar un resultado', async () => {
  let reloj = 0
  let llamadas = 0
  const { respuesta, agotado } = await esperarResultadoPago('RL-1', {
    consultar: async () => {
      llamadas += 1
      if (llamadas % 2) throw Object.assign(new Error('red'), { sinRespuesta: true })
      return { estado: 'EN_PROCESO' }
    },
    maxEsperaMs: 10000,
    intervaloMs: 2500,
    ahora: () => reloj,
    dormir: async (ms) => {
      reloj += ms
    },
  })
  assert.equal(agotado, true)
  assert.equal(respuesta.estado, 'EN_PROCESO')
})

test('esperarResultadoPago amplía la espera durante el desafío 3DS', async () => {
  let reloj = 0
  let n = 0
  const { respuesta } = await esperarResultadoPago('RL-1', {
    consultar: async () => (++n < 20 ? { estado: 'ACCION_REQUERIDA' } : { estado: 'RECHAZADO' }),
    maxEsperaMs: 5000,
    limitePara: (r) => (r?.estado === 'ACCION_REQUERIDA' ? 600000 : 5000),
    ahora: () => reloj,
    dormir: async (ms) => {
      reloj += ms
    },
  })
  assert.equal(respuesta.estado, 'RECHAZADO')
})

test('esperarResultadoPago propaga 401/404 (operación ajena o sesión de la cuenta vencida)', async () => {
  await assert.rejects(
    esperarResultadoPago('RL-1', { consultar: async () => { throw Object.assign(new Error('x'), { status: 404 }) }, dormir: sinDormir }),
    (e) => e.status === 404,
  )
})

test('utilidades: fallos transitorios y claves únicas', () => {
  assert.ok(esFalloTransitorio({ sinRespuesta: true }))
  assert.ok(esFalloTransitorio({ status: 503 }))
  assert.equal(esFalloTransitorio({ status: 409 }), false)
  const claves = new Set(Array.from({ length: 50 }, nuevaClaveIdempotencia))
  assert.equal(claves.size, 50)
  for (const clave of claves) assert.match(clave, /^[A-Za-z0-9-]{16,64}$/)
})
