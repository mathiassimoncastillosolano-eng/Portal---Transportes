import { test } from 'node:test'
import assert from 'node:assert/strict'
import { consultarDisponibilidad, RUTA_READINESS } from './saludServicio.js'
import { RESULTADOS } from '../utilidades/inicializacion.js'

function respuesta(status, cuerpo, tipo = 'application/json') {
  return {
    status,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? tipo : null) },
    json: async () => (typeof cuerpo === 'string' ? JSON.parse(cuerpo) : cuerpo),
  }
}

test('consulta la URL configurada sin token, sin caché y sin Content-Type (sin preflight CORS)', async () => {
  let llamada
  const fetchImpl = async (url, opciones) => {
    llamada = { url, opciones }
    return respuesta(200, { status: 'READY' })
  }
  const r = await consultarDisponibilidad({ fetchImpl, urlBase: 'https://api.ejemplo' })
  assert.equal(r.tipo, RESULTADOS.LISTO)
  assert.equal(llamada.url, `https://api.ejemplo${RUTA_READINESS}`)
  assert.equal(llamada.opciones.cache, 'no-store')
  assert.equal(llamada.opciones.credentials, 'omit')
  assert.equal(llamada.opciones.headers.Authorization, undefined)
  assert.equal(llamada.opciones.headers['Content-Type'], undefined)
})

test('503 NOT_READY es un estado, no una excepción', async () => {
  const r = await consultarDisponibilidad({
    fetchImpl: async () => respuesta(503, { status: 'NOT_READY', fase: 'INICIANDO' }),
    urlBase: '',
  })
  assert.equal(r.tipo, RESULTADOS.INICIANDO)
})

test('502 con página HTML de Render no rompe el parseo', async () => {
  const r = await consultarDisponibilidad({
    fetchImpl: async () => respuesta(502, '<html>Bad gateway</html>', 'text/html'),
    urlBase: '',
  })
  assert.equal(r.tipo, RESULTADOS.CONECTANDO)
})

test('JSON malformado con content-type JSON se trata como "conectando"', async () => {
  const r = await consultarDisponibilidad({
    fetchImpl: async () => ({ status: 504, headers: { get: () => 'application/json' }, json: async () => { throw new SyntaxError('x') } }),
    urlBase: '',
  })
  assert.equal(r.tipo, RESULTADOS.CONECTANDO)
})

test('error de red / CORS → conectando', async () => {
  const r = await consultarDisponibilidad({
    fetchImpl: async () => {
      throw new TypeError('Failed to fetch')
    },
    urlBase: '',
  })
  assert.equal(r.tipo, RESULTADOS.CONECTANDO)
  assert.equal(r.status, 0)
})

test('timeout por solicitud aborta y devuelve conectando', async () => {
  const fetchImpl = (_url, { signal }) =>
    new Promise((_, rechazar) => signal.addEventListener('abort', () => rechazar(new Error('abort'))))
  const r = await consultarDisponibilidad({ fetchImpl, urlBase: '', timeoutMs: 30 })
  assert.equal(r.tipo, RESULTADOS.CONECTANDO)
  assert.equal(r.timeout, true)
})

test('abortar desde fuera devuelve CANCELADO', async () => {
  const controlador = new AbortController()
  const fetchImpl = (_url, { signal }) =>
    new Promise((_, rechazar) => signal.addEventListener('abort', () => rechazar(new Error('abort'))))
  const promesa = consultarDisponibilidad({ fetchImpl, urlBase: '', signal: controlador.signal })
  controlador.abort()
  assert.equal((await promesa).tipo, 'CANCELADO')
})
