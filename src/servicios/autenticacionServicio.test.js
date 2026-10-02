import { afterEach, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { iniciarSesionConGoogle } from './autenticacionServicio.js'

const fetchOriginal = globalThis.fetch
const almacenOriginal = globalThis.localStorage

beforeEach(() => {
  const datos = new Map()
  globalThis.localStorage = {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
  }
})

afterEach(() => {
  globalThis.fetch = fetchOriginal
  if (almacenOriginal === undefined) delete globalThis.localStorage
  else globalThis.localStorage = almacenOriginal
})

test('el inicio con Google envía la credencial sin Authorization, guarda el JWT propio y carga el perfil', async () => {
  localStorage.setItem('rutalibre:token', 'token-viejo')
  const llamadas = []
  globalThis.fetch = async (url, opciones) => {
    const ruta = new URL(url).pathname
    llamadas.push({ ruta, opciones })
    if (ruta === '/api/auth/google') {
      return new Response(JSON.stringify({ token: 'jwt-propio', usuario: { idUsuario: 7 } }))
    }
    return new Response(JSON.stringify({
      idUsuario: 7, nombres: 'Ana', apellidos: 'Pérez', correo: 'ana@gmail.com', nroTelefono: null,
    }))
  }

  const usuario = await iniciarSesionConGoogle('credencial-de-google')

  assert.equal(llamadas[0].ruta, '/api/auth/google')
  assert.equal(llamadas[0].opciones.method, 'POST')
  assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { credential: 'credencial-de-google' })
  assert.equal(llamadas[0].opciones.headers.Authorization, undefined)
  assert.equal(llamadas[1].ruta, '/api/usuarios/perfil')
  assert.equal(llamadas[1].opciones.headers.Authorization, 'Bearer jwt-propio')
  assert.equal(localStorage.getItem('rutalibre:token'), 'jwt-propio')
  assert.deepEqual({ id: usuario.id, correo: usuario.correo, telefono: usuario.telefono }, { id: 7, correo: 'ana@gmail.com', telefono: '' })
})

test('si el backend rechaza la credencial se propaga el mensaje y no se guarda ningún token', async () => {
  globalThis.fetch = async () => new Response(
    JSON.stringify({ mensaje: 'La credencial de Google no es valida o expiro.' }), { status: 401 })

  await assert.rejects(() => iniciarSesionConGoogle('mala'), (error) => {
    assert.equal(error.status, 401)
    assert.match(error.message, /credencial de Google/)
    return true
  })
  assert.equal(localStorage.getItem('rutalibre:token'), null)
})
