import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { consultarDni } from './dniServicio.js'

const fetchOriginal = globalThis.fetch
// El cliente HTTP lee el JWT de localStorage; en Node se simula una sesión iniciada.
globalThis.localStorage = { getItem: () => 'jwt-de-prueba' }
afterEach(() => { globalThis.fetch = fetchOriginal })

test('consulta el DNI en el backend y no manda ningún token de ApiPeru', async () => {
  const datos = { dni: '12345678', existente: true, origen: 'BD', nombres: 'Ana', apellidos: 'Lopez', fechaNacimiento: '1990-01-01', nroTelefono: '911111111' }
  let llamada
  globalThis.fetch = async (url, opciones) => {
    llamada = { url: new URL(url), opciones }
    return new Response(JSON.stringify(datos))
  }
  assert.deepEqual(await consultarDni('12345678'), datos)
  assert.equal(llamada.url.pathname, '/api/pasajeros/dni/12345678')
  assert.equal(llamada.url.search, '')
  assert.equal(llamada.opciones.headers.Authorization, 'Bearer jwt-de-prueba')
})

test('propaga el status cuando el backend rechaza la consulta', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ mensaje: 'No autenticado.' }), { status: 401 })
  await assert.rejects(consultarDni('12345678'), (error) => error.status === 401)
})
