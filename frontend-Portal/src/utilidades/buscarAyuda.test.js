import test from 'node:test'
import assert from 'node:assert/strict'
import { buscarAyuda, normalizar } from './buscarAyuda.js'

const datos = {
  categorias: [
    { id: 'compra', etiqueta: 'Compra de pasajes' },
    { id: 'cambios', etiqueta: 'Cambio de viaje' },
  ],
  guias: [
    {
      id: 'pagar',
      categoria: 'compra',
      titulo: 'Cómo pagar tu compra',
      resumen: 'Paga con tarjeta o Yape.',
      palabras: 'culqi yape tarjeta',
      pasos: [{ titulo: 'Revisa el importe', texto: 'Total a pagar' }],
    },
    {
      id: 'cambiar',
      categoria: 'cambios',
      titulo: 'Cómo cambiar el viaje de un pasaje',
      resumen: 'Pasa tu pasaje a otra salida.',
      palabras: 'postergar',
      pasos: [{ titulo: 'Ubica tu pasaje', texto: 'Mis pasajes' }],
    },
  ],
  preguntas: [
    {
      id: 'yape',
      categoria: 'compra',
      pregunta: '¿Puedo pagar con Yape?',
      respuesta: 'Sí, mediante Culqi.',
      palabras: 'yape pago',
    },
  ],
}

test('normalizar quita tildes, signos y mayúsculas', () => {
  assert.equal(normalizar('  ¿Cómo PAGÓ, aquí?  '), 'como pago aqui')
})

test('normalizar tolera valores vacíos', () => {
  assert.equal(normalizar(undefined), '')
  assert.equal(normalizar(null), '')
})

test('encuentra por palabra clave sin importar tildes', () => {
  const r = buscarAyuda('POSTERGAR', datos)
  assert.deepEqual(r.guias.map((g) => g.id), ['cambiar'])
  assert.equal(r.preguntas.length, 0)
})

test('encuentra guías y preguntas relacionadas', () => {
  const r = buscarAyuda('yape', datos)
  assert.deepEqual(r.guias.map((g) => g.id), ['pagar'])
  assert.deepEqual(r.preguntas.map((p) => p.id), ['yape'])
})

test('una frase ignora palabras vacías y exige todos los términos', () => {
  assert.deepEqual(buscarAyuda('cómo puedo pagar con tarjeta', datos).guias.map((g) => g.id), ['pagar'])
  assert.equal(buscarAyuda('pagar avion', datos).guias.length, 0)
})

test('acepta plurales', () => {
  assert.deepEqual(buscarAyuda('pasajes', datos).guias.map((g) => g.id), ['cambiar', 'pagar'])
})

test('consulta vacía o sin coincidencias devuelve listas vacías', () => {
  assert.deepEqual(buscarAyuda('   ', datos), { guias: [], preguntas: [] })
  assert.deepEqual(buscarAyuda('zzzz', datos), { guias: [], preguntas: [] })
})

test('ordena primero las coincidencias en el título', () => {
  const r = buscarAyuda('pasaje', datos)
  assert.equal(r.guias[0].id, 'cambiar')
})
