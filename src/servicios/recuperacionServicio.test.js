import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  completarRecuperacionContrasena, reenviarCodigoRecuperacion,
  solicitarCodigoRecuperacion, verificarCodigoRecuperacion,
} from './autenticacionServicio.js'

const fetchOriginal = globalThis.fetch
const almacenOriginal = globalThis.localStorage

beforeEach(() => {
  const datos = new Map([['rutalibre:token', 'jwt-de-sesion']])
  globalThis.localStorage = {
    getItem: (c) => (datos.has(c) ? datos.get(c) : null),
    setItem: (c, v) => datos.set(c, String(v)),
    removeItem: (c) => datos.delete(c),
  }
})
afterEach(() => {
  globalThis.fetch = fetchOriginal
  if (almacenOriginal === undefined) delete globalThis.localStorage
  else globalThis.localStorage = almacenOriginal
})

function capturar(respuesta = {}, status = 200) {
  const llamadas = []
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ ruta: new URL(url).pathname, opciones })
    return new Response(JSON.stringify(respuesta), { status })
  }
  return llamadas
}

test('solicitar y reenviar usan su ruta, normalizan el correo y no envían el JWT', async () => {
  const llamadas = capturar({ mensaje: 'ok' })
  await solicitarCodigoRecuperacion('  ANA@Example.com ')
  await reenviarCodigoRecuperacion('ana@example.com')
  assert.deepEqual(llamadas.map((l) => l.ruta), ['/api/auth/password-reset/request', '/api/auth/password-reset/resend'])
  assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { correo: 'ana@example.com' })
  assert.equal(llamadas[0].opciones.method, 'POST')
  assert.equal(llamadas[0].opciones.headers.Authorization, undefined)
})

test('verificar envía correo y código y devuelve la prueba', async () => {
  const llamadas = capturar({ pruebaRecuperacion: 'p.q', expiraEnSegundos: 600 })
  const r = await verificarCodigoRecuperacion('ana@example.com', '048213')
  assert.equal(llamadas[0].ruta, '/api/auth/password-reset/verify')
  assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { correo: 'ana@example.com', codigo: '048213' })
  assert.equal(r.pruebaRecuperacion, 'p.q')
})

test('completar envía la prueba y las contraseñas, sin ningún identificador de usuario', async () => {
  const llamadas = capturar({ mensaje: 'ok' })
  await completarRecuperacionContrasena('p.q', 'NuevaClave2026!', 'NuevaClave2026!')
  const cuerpo = JSON.parse(llamadas[0].opciones.body)
  assert.deepEqual(Object.keys(cuerpo).sort(), ['confirmarContrasena', 'contrasena', 'pruebaRecuperacion'])
  assert.equal(llamadas[0].opciones.headers.Authorization, undefined)
})

test('los errores del backend conservan mensaje y estado', async () => {
  capturar({ mensaje: 'La verificación venció.' }, 410)
  await assert.rejects(() => completarRecuperacionContrasena('x', 'a', 'a'), (e) => {
    assert.equal(e.status, 410)
    assert.match(e.message, /venció/)
    return true
  })
})
