import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { reclamarSesion } from './propiedadSesionPestana.js'

const descriptorOriginal = Object.getOwnPropertyDescriptor(globalThis, 'navigator')

function simularNavegador(locks) {
  Object.defineProperty(globalThis, 'navigator', { value: { locks }, configurable: true, writable: true })
}

afterEach(() => {
  if (descriptorOriginal) Object.defineProperty(globalThis, 'navigator', descriptorOriginal)
  else delete globalThis.navigator
})

// Simula los candados del navegador: un nombre ya tomado (por OTRA pestaña) no está disponible.
function crearCandadosConOcupados(nombresOcupados = []) {
  const ocupados = new Set(nombresOcupados)
  return {
    request(nombre, opciones, devolucion) {
      if (ocupados.has(nombre)) return devolucion(null)
      ocupados.add(nombre)
      return devolucion({ name: nombre })
    },
  }
}

test('sin soporte de candados se asume que la sesión es de esta pestaña', async () => {
  simularNavegador(undefined)
  assert.equal(await reclamarSesion('token-sin-soporte'), true)
})

test('una sesión libre pasa a ser de esta pestaña', async () => {
  simularNavegador(crearCandadosConOcupados())
  assert.equal(await reclamarSesion('token-libre'), true)
})

test('una sesión que ya usa otra pestaña no se puede reclamar', async () => {
  simularNavegador(crearCandadosConOcupados(['rutalibre:sesion-asientos:propietaria:token-ajeno']))
  assert.equal(await reclamarSesion('token-ajeno'), false)
})

test('volver a reclamar una sesión propia sigue siendo true', async () => {
  simularNavegador(crearCandadosConOcupados())
  assert.equal(await reclamarSesion('token-propio'), true)
  // Aunque el candado ya esté tomado (por esta misma pestaña), se recuerda que es suyo.
  simularNavegador(crearCandadosConOcupados(['rutalibre:sesion-asientos:propietaria:token-propio']))
  assert.equal(await reclamarSesion('token-propio'), true)
})
