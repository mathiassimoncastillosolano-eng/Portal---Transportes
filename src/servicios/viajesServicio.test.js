import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { buscarViajes, guardarPasajeros, confirmarCompraDemo } from './viajesServicio.js'

const fetchOriginal = globalThis.fetch
afterEach(() => { globalThis.fetch = fetchOriginal })

test('envía fecha y horario a la API pública conservando identificadores y valores reales', async () => {
  const viajes = [{ id: 10, fechaSalida: '2026-09-23', horaSalida: '07:30', asientosDisponibles: 36, precio: 110 }]
  globalThis.fetch = async (url, opciones) => {
    const consulta = new URL(url)
    assert.equal(consulta.pathname, '/api/viajes/buscar')
    assert.equal(consulta.searchParams.get('origen'), 'Lima')
    assert.equal(consulta.searchParams.get('destino'), 'Cusco')
    assert.equal(consulta.searchParams.get('fecha'), '2026-09-23')
    assert.equal(consulta.searchParams.get('horario'), 'mañana')
    assert.equal(opciones.headers.Authorization, undefined)
    return new Response(JSON.stringify(viajes))
  }
  assert.deepEqual(await buscarViajes({ origen: ' Lima ', destino: 'Cusco', fecha: '2026-09-23', horario: 'mañana' }), viajes)
})

test('no genera viajes ficticios cuando la búsqueda devuelve vacío', async () => {
  globalThis.fetch = async () => new Response('[]')
  assert.deepEqual(await buscarViajes({ origen: 'Lima', destino: 'Cusco', fecha: '2026-09-24' }), [])
})

test('muestra errores de API y rechaza entradas incompletas sin consultar', async () => {
  globalThis.fetch = async () => { throw new Error('No debe consultar') }
  await assert.rejects(buscarViajes({ origen: 'Lima', destino: 'Cusco' }), /obligatorios/)
  globalThis.fetch = async () => new Response(JSON.stringify({ mensaje: 'Horario no válido.' }), { status: 400 })
  await assert.rejects(buscarViajes({ origen: 'Lima', destino: 'Cusco', fecha: '2026-09-23' }), /Horario no válido/)
})

test('errores de conexión y respuestas inválidas no se confunden con cero viajes', async () => {
  const criterios = { origen: 'Lima', destino: 'Cusco', fecha: '2026-09-23' }
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(buscarViajes(criterios), /conectar con el servidor/)
  globalThis.fetch = async () => new Response('<html>Error</html>')
  await assert.rejects(buscarViajes(criterios), /respuesta de viajes no válida/)
})

const pasajerosApi = [{
  idAsiento: 7, tipoDocumento: 'DNI', numeroDocumento: '12345678',
  nombres: 'Ana', apellidos: 'Pérez', fechaNacimiento: '1990-05-10', nroTelefono: '987654321',
}]

test('guardarPasajeros envía tokenSesion y pasajeros por POST sin Authorization', async () => {
  let llamada
  globalThis.fetch = async (url, opciones) => {
    llamada = { url: new URL(url), opciones }
    return new Response(JSON.stringify({ valido: true, errores: [] }))
  }
  const resultado = await guardarPasajeros(15, 'tok-abc', pasajerosApi)
  assert.equal(llamada.url.pathname, '/api/viajes/15/pasajeros')
  assert.equal(llamada.opciones.method, 'POST')
  assert.equal(llamada.opciones.headers.Authorization, undefined)
  assert.deepEqual(JSON.parse(llamada.opciones.body), { tokenSesion: 'tok-abc', pasajeros: pasajerosApi })
  assert.deepEqual(resultado, { valido: true, errores: [] })
})

test('guardarPasajeros devuelve los errores por campo sin lanzar cuando valido=false', async () => {
  const errores = [{ idAsiento: 7, campo: 'numeroDocumento', mensaje: 'Este DNI ya tiene un pasaje en este viaje.' }]
  globalThis.fetch = async () => new Response(JSON.stringify({ valido: false, errores }))
  assert.deepEqual(await guardarPasajeros(15, 'tok-abc', pasajerosApi), { valido: false, errores })
})

test('guardarPasajeros propaga el status de 401, 409 y 410', async () => {
  for (const status of [401, 409, 410]) {
    globalThis.fetch = async () => new Response(JSON.stringify({ mensaje: 'Error de sesión.' }), { status })
    await assert.rejects(guardarPasajeros(15, 'tok-abc', pasajerosApi), (error) => error.status === status)
  }
})

test('confirmarCompraDemo llama a /confirmar-demo con el token en el cuerpo y no en la URL', async () => {
  let llamada
  globalThis.fetch = async (url, opciones) => {
    llamada = { url: new URL(url), opciones }
    return new Response(JSON.stringify([7]))
  }
  assert.deepEqual(await confirmarCompraDemo(15, 'tok-abc'), [7])
  assert.equal(llamada.url.pathname, '/api/viajes/15/confirmar-demo')
  assert.equal(llamada.url.search, '')
  assert.equal(llamada.opciones.method, 'POST')
  assert.deepEqual(JSON.parse(llamada.opciones.body), { tokenSesion: 'tok-abc' })
})
