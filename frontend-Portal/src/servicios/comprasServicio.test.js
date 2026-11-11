import assert from 'node:assert/strict'
import test from 'node:test'
import { listarCompras, listarHistorial, obtenerCompra, obtenerResumenPerfil } from './comprasServicio.js'

test('cada consulta usa su ruta GET y no envía ningún id de usuario', async () => {
  const llamadas = []
  const enviar = async (ruta, opciones) => {
    llamadas.push([ruta, opciones])
    if (ruta.endsWith('/resumen')) return { pasajes: 4, viajesCompletados: 1, tickets: 3, comprasVigentes: 1 }
    if (ruta.endsWith('/pasajes')) return { comprasVigentes: 0, compras: [] }
    if (ruta.endsWith('/historial')) return []
    return { idVenta: 7, boletos: [] }
  }
  await obtenerResumenPerfil({ enviar })
  await listarCompras({ enviar })
  await listarHistorial({ enviar })
  await obtenerCompra('7', { enviar })
  assert.deepEqual(llamadas.map(([r]) => r), [
    '/api/usuarios/perfil/resumen', '/api/usuarios/perfil/pasajes', '/api/usuarios/perfil/historial', '/api/usuarios/perfil/pasajes/7',
  ])
  for (const [, opciones] of llamadas) {
    assert.equal(opciones.method, 'GET')
    assert.equal(opciones.body, undefined)
  }
})

test('rechaza respuestas con forma inesperada en lugar de mostrarlas', async () => {
  await assert.rejects(obtenerResumenPerfil({ enviar: async () => ({ pasajes: 'x' }) }), /resumen no es válida/)
  await assert.rejects(listarCompras({ enviar: async () => ({}) }), /compras no es válida/)
  await assert.rejects(listarHistorial({ enviar: async () => ({}) }), /historial no es válida/)
  await assert.rejects(obtenerCompra(1, { enviar: async () => ({ idVenta: 1 }) }), /compra no es válida/)
})

test('no consulta con un identificador de compra inválido', async () => {
  let llamadas = 0
  const enviar = async () => { llamadas += 1; return {} }
  for (const id of ['abc', '', '0', '-3', '1.5', '../usuarios', undefined]) {
    await assert.rejects(obtenerCompra(id, { enviar }), /identificador/)
  }
  assert.equal(llamadas, 0)
})

test('propaga los errores del backend (404 de una compra ajena, caída del servidor)', async () => {
  const noEncontrada = Object.assign(new Error('No se encontró la compra solicitada.'), { status: 404 })
  await assert.rejects(obtenerCompra(5, { enviar: async () => { throw noEncontrada } }), (e) => e.status === 404)
  const caida = Object.assign(new Error('No se pudo conectar con el servidor.'), { sinRespuesta: true })
  await assert.rejects(listarCompras({ enviar: async () => { throw caida } }), /No se pudo conectar/)
})
