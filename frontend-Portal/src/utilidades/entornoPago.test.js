import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ADVERTENCIA_PRODUCCION,
  ENTORNO_PRODUCCION,
  ENTORNO_SANDBOX,
  entornoInicial,
  entornoUtilizable,
  esSandbox,
  normalizarConfiguracion,
  publicKeyDe,
  puedeElegirEntorno,
} from './entornoPago.js'

const soloProduccion = normalizarConfiguracion({
  entornos: [{ codigo: 'PRODUCTION', disponible: true, publicKey: 'APP_USR-prod-publica' }],
  entornoPorDefecto: 'PRODUCTION',
})
const conSandbox = normalizarConfiguracion({
  entornos: [
    { codigo: 'PRODUCTION', disponible: true, publicKey: 'APP_USR-prod-publica' },
    { codigo: 'SANDBOX', disponible: true, publicKey: 'APP_USR-prueba-publica' },
  ],
  entornoPorDefecto: 'PRODUCTION',
})

test('un comprador normal solo recibe Producción: no hay selector', () => {
  assert.equal(puedeElegirEntorno(soloProduccion), false)
  assert.equal(entornoInicial(soloProduccion), ENTORNO_PRODUCCION)
})

test('un usuario autorizado ve ambos entornos y arranca SIEMPRE en Producción', () => {
  assert.equal(puedeElegirEntorno(conSandbox), true)
  assert.equal(entornoInicial(conSandbox), ENTORNO_PRODUCCION)
})

test('si el backend no incluye Producción por defecto se usa el primero disponible', () => {
  const cfg = normalizarConfiguracion({ entornos: [{ codigo: 'SANDBOX', disponible: true, publicKey: 'k' }], entornoPorDefecto: 'PRODUCTION' })
  assert.equal(entornoInicial(cfg), ENTORNO_SANDBOX)
})

test('cada entorno usa su propia Public Key', () => {
  assert.equal(publicKeyDe(conSandbox, ENTORNO_PRODUCCION), 'APP_USR-prod-publica')
  assert.equal(publicKeyDe(conSandbox, ENTORNO_SANDBOX), 'APP_USR-prueba-publica')
})

test('Producción nunca usa la clave de respaldo de Sandbox', () => {
  const sinClaveProd = normalizarConfiguracion({
    entornos: [{ codigo: 'PRODUCTION', disponible: false, publicKey: null }],
  })
  assert.equal(publicKeyDe(sinClaveProd, ENTORNO_PRODUCCION, { respaldoSandbox: 'APP_USR-respaldo-prueba' }), '')
  assert.equal(entornoUtilizable(sinClaveProd, ENTORNO_PRODUCCION, { respaldoSandbox: 'APP_USR-respaldo-prueba' }), false)
})

test('Sandbox acepta la clave heredada (VITE_MERCADOPAGO_PUBLIC_KEY) solo si el backend aún no entrega la suya', () => {
  const sinClaveSandbox = normalizarConfiguracion({
    entornos: [
      { codigo: 'PRODUCTION', disponible: true, publicKey: 'p' },
      { codigo: 'SANDBOX', disponible: true, publicKey: null },
    ],
  })
  assert.equal(publicKeyDe(sinClaveSandbox, ENTORNO_SANDBOX, { respaldoSandbox: ' APP_USR-heredada ' }), 'APP_USR-heredada')
  assert.equal(publicKeyDe(sinClaveSandbox, ENTORNO_SANDBOX), '')
  // El respaldo no se aplica si el usuario ni siquiera tiene Sandbox.
  assert.equal(publicKeyDe(soloProduccion, ENTORNO_SANDBOX, { respaldoSandbox: 'APP_USR-heredada' }), '')
})

test('un entorno sin credenciales en el servidor no es utilizable aunque tenga clave', () => {
  const cfg = normalizarConfiguracion({ entornos: [{ codigo: 'PRODUCTION', disponible: false, publicKey: 'k' }] })
  assert.equal(entornoUtilizable(cfg, ENTORNO_PRODUCCION), false)
  assert.equal(entornoUtilizable(conSandbox, ENTORNO_SANDBOX), true)
})

test('la normalización descarta entornos desconocidos, duplicados y claves vacías', () => {
  const cfg = normalizarConfiguracion({
    entornos: [
      { codigo: 'STAGING', disponible: true, publicKey: 'x' },
      { codigo: 'PRODUCTION', disponible: true, publicKey: '   ' },
      { codigo: 'PRODUCTION', disponible: true, publicKey: 'otra' },
      null,
    ],
    entornoPorDefecto: 'OTRO',
  })
  assert.deepEqual(cfg.entornos, [{ codigo: 'PRODUCTION', disponible: true, publicKey: null }])
  assert.equal(cfg.entornoPorDefecto, ENTORNO_PRODUCCION)
  assert.deepEqual(normalizarConfiguracion(null).entornos, [])
})

test('la advertencia de Producción es el texto exigido', () => {
  assert.equal(
    ADVERTENCIA_PRODUCCION,
    'Estás ingresando al entorno de producción. Las transacciones realizadas utilizarán dinero real y se procesarán mediante Mercado Pago.',
  )
  assert.equal(esSandbox(ENTORNO_SANDBOX), true)
  assert.equal(esSandbox(ENTORNO_PRODUCCION), false)
})
