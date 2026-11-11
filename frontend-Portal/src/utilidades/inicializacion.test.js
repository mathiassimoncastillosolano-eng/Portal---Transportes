import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ESTADOS_INICIO,
  RESULTADOS,
  TIEMPOS_INICIO,
  calcularEspera,
  clasificarRespuesta,
  describirEstado,
  esperaAgotada,
  etapaDe,
} from './inicializacion.js'
import { crearCicloInicializacion } from './cicloInicializacion.js'

// ---------------------------------------------------------------------------
// clasificarRespuesta
// ---------------------------------------------------------------------------

test('solo 200 + READY habilita la aplicación', () => {
  assert.equal(clasificarRespuesta(200, { status: 'READY' }).tipo, RESULTADOS.LISTO)
  assert.equal(clasificarRespuesta(200, { status: 'UP' }).tipo, RESULTADOS.CONECTANDO)
  assert.equal(clasificarRespuesta(200, null).tipo, RESULTADOS.CONECTANDO)
})

test('200 DEGRADED no confirma disponibilidad', () => {
  assert.equal(clasificarRespuesta(200, { status: 'DEGRADED', fase: 'DEPENDENCIAS' }).tipo, RESULTADOS.DEPENDENCIAS)
})

test('503 NOT_READY distingue arranque de Spring y dependencias', () => {
  assert.equal(clasificarRespuesta(503, { status: 'NOT_READY', fase: 'INICIANDO' }).tipo, RESULTADOS.INICIANDO)
  assert.equal(clasificarRespuesta(503, { status: 'NOT_READY', fase: 'DEPENDENCIAS' }).tipo, RESULTADOS.DEPENDENCIAS)
  assert.equal(clasificarRespuesta(503, { status: 'NOT_READY' }).tipo, RESULTADOS.INICIANDO)
})

test('502, 504 y 503 sin JSON (proxy de Render) son "conectando"', () => {
  for (const codigo of [502, 503, 504]) {
    assert.equal(clasificarRespuesta(codigo, null).tipo, RESULTADOS.CONECTANDO, `HTTP ${codigo}`)
  }
  assert.equal(clasificarRespuesta(502, { status: 'x' }).tipo, RESULTADOS.CONECTANDO)
  assert.equal(clasificarRespuesta(429, null).tipo, RESULTADOS.CONECTANDO)
})

test('404 de Spring (JSON) deja pasar por compatibilidad; 404 HTML no', () => {
  assert.equal(clasificarRespuesta(404, { status: 404, error: 'Not Found' }).tipo, RESULTADOS.LISTO)
  assert.equal(clasificarRespuesta(404, null).tipo, RESULTADOS.CONECTANDO)
})

// ---------------------------------------------------------------------------
// Backoff y límites
// ---------------------------------------------------------------------------

test('backoff: intervalo inicial, progresivo y con techo', () => {
  const sinVariacion = 0.5 // aleatorio 0.5 → variación 0
  assert.equal(calcularEspera(1, sinVariacion), TIEMPOS_INICIO.intervaloInicial)
  assert.equal(calcularEspera(TIEMPOS_INICIO.intentosSinBackoff, sinVariacion), TIEMPOS_INICIO.intervaloInicial)
  assert.ok(calcularEspera(TIEMPOS_INICIO.intentosSinBackoff + 1, sinVariacion) > TIEMPOS_INICIO.intervaloInicial)
  assert.equal(calcularEspera(50, sinVariacion), TIEMPOS_INICIO.intervaloMaximo)
})

test('backoff: variación aleatoria acotada a ±20 %', () => {
  const base = TIEMPOS_INICIO.intervaloInicial
  assert.equal(calcularEspera(1, 0), Math.round(base * 0.8))
  assert.equal(calcularEspera(1, 0.999999), Math.round(base * 1.2))
})

test('el intervalo inicial está entre 2 y 3 s y el límite no es corto', () => {
  assert.ok(TIEMPOS_INICIO.intervaloInicial >= 2000 && TIEMPOS_INICIO.intervaloInicial <= 3000)
  assert.ok(TIEMPOS_INICIO.limiteEspera >= 180000)
  assert.equal(esperaAgotada(TIEMPOS_INICIO.limiteEspera - 1), false)
  assert.equal(esperaAgotada(TIEMPOS_INICIO.limiteEspera), true)
})

// ---------------------------------------------------------------------------
// Mensajes y etapas
// ---------------------------------------------------------------------------

test('mensajes corresponden al estado real', () => {
  const m = (datos) => describirEstado(datos).titulo
  assert.equal(m({ estado: ESTADOS_INICIO.INITIALIZING }), 'Preparando tu próximo viaje')
  assert.equal(m({ estado: ESTADOS_INICIO.INITIALIZING, lento: true }), 'Estableciendo conexión con RutaLibre')
  assert.equal(m({ estado: ESTADOS_INICIO.WAITING, tipo: RESULTADOS.CONECTANDO }), 'Estableciendo conexión con RutaLibre')
  assert.equal(m({ estado: ESTADOS_INICIO.WAITING, tipo: RESULTADOS.INICIANDO }), 'Inicializando nuestros servicios')
  assert.equal(m({ estado: ESTADOS_INICIO.WAITING, tipo: RESULTADOS.DEPENDENCIAS }), 'Comprobando nuestros sistemas')
  assert.equal(m({ estado: ESTADOS_INICIO.READY }), 'Todo está listo. ¡Buen viaje!')
  assert.equal(describirEstado({ estado: ESTADOS_INICIO.ERROR }).clave, 'error')
})

test('ningún mensaje previo a READY afirma que la base de datos está conectada', () => {
  for (const tipo of [null, ...Object.values(RESULTADOS).filter((t) => t !== RESULTADOS.LISTO)]) {
    const { titulo, detalle } = describirEstado({ estado: ESTADOS_INICIO.WAITING, tipo })
    const texto = `${titulo} ${detalle}`.toLowerCase()
    assert.ok(!/conectad[ao]|disponible\b(?! antes)|%/.test(texto), texto)
  }
})

test('etapas: no se marca una etapa sin confirmarla', () => {
  assert.deepEqual(etapaDe(RESULTADOS.CONECTANDO), { completadas: 0, activa: 0 })
  assert.deepEqual(etapaDe(null), { completadas: 0, activa: 0 })
  assert.deepEqual(etapaDe(RESULTADOS.INICIANDO), { completadas: 1, activa: 1 })
  assert.deepEqual(etapaDe(RESULTADOS.DEPENDENCIAS), { completadas: 2, activa: 2 })
  assert.deepEqual(etapaDe(RESULTADOS.LISTO), { completadas: 3, activa: -1 })
})

// ---------------------------------------------------------------------------
// Ciclo de polling (con reloj y temporizadores simulados)
// ---------------------------------------------------------------------------

function relojFalso() {
  let t = 0
  let id = 0
  const pendientes = new Map()
  return {
    ahora: () => t,
    programar(fn, ms) {
      id += 1
      pendientes.set(id, { fn, en: t + ms })
      return id
    },
    cancelar(i) {
      pendientes.delete(i)
    },
    pendientes,
    /** Avanza hasta el siguiente temporizador y lo ejecuta. */
    async siguiente() {
      await vaciar()
      const [i, p] = [...pendientes.entries()].sort((a, b) => a[1].en - b[1].en)[0] ?? []
      if (!p) return false
      t = p.en
      pendientes.delete(i)
      p.fn()
      await vaciar()
      return true
    },
    avanzar(ms) {
      t += ms
    },
  }
}

const vaciar = () => new Promise((r) => setImmediate(r))

function montar(respuestas, opciones = {}) {
  const reloj = relojFalso()
  const estados = []
  let llamadas = 0
  let simultaneas = 0
  let maxSimultaneas = 0
  const ciclo = crearCicloInicializacion({
    consultar: async ({ signal }) => {
      llamadas += 1
      simultaneas += 1
      maxSimultaneas = Math.max(maxSimultaneas, simultaneas)
      await vaciar()
      simultaneas -= 1
      if (signal.aborted) return { tipo: 'CANCELADO' }
      const r = respuestas.length > 1 ? respuestas.shift() : respuestas[0]
      if (r.demora) reloj.avanzar(r.demora)
      return r
    },
    alCambiar: (e) => estados.push(e),
    ahora: reloj.ahora,
    programar: reloj.programar,
    cancelar: reloj.cancelar,
    aleatorio: () => 0.5,
    ...opciones,
  })
  return {
    ciclo,
    reloj,
    estados,
    get llamadas() {
      return llamadas
    },
    get maxSimultaneas() {
      return maxSimultaneas
    },
    ultimo: () => estados.at(-1),
  }
}

test('backend activo: READY en la primera comprobación', async () => {
  const p = montar([{ tipo: RESULTADOS.LISTO }])
  p.ciclo.iniciar()
  await vaciar()
  await vaciar()
  assert.equal(p.ultimo().estado, ESTADOS_INICIO.READY)
  assert.equal(p.llamadas, 1)
  assert.ok(!p.estados.some((e) => e.estado === ESTADOS_INICIO.WAITING))
})

test('backend suspendido: 503/502 se reintentan hasta READY, sin solicitudes simultáneas', async () => {
  const p = montar([
    { tipo: RESULTADOS.CONECTANDO }, // 502
    { tipo: RESULTADOS.CONECTANDO }, // timeout
    { tipo: RESULTADOS.INICIANDO }, // 503 INICIANDO
    { tipo: RESULTADOS.DEPENDENCIAS }, // 503 DEPENDENCIAS
    { tipo: RESULTADOS.LISTO },
  ])
  p.ciclo.iniciar()
  while (p.ultimo().estado !== ESTADOS_INICIO.READY && (await p.reloj.siguiente()));
  assert.equal(p.ultimo().estado, ESTADOS_INICIO.READY)
  assert.equal(p.llamadas, 5)
  assert.equal(p.maxSimultaneas, 1)
  const tipos = p.estados.filter((e) => e.estado === ESTADOS_INICIO.WAITING).map((e) => e.tipo)
  assert.deepEqual(tipos, [RESULTADOS.CONECTANDO, RESULTADOS.CONECTANDO, RESULTADOS.INICIANDO, RESULTADOS.DEPENDENCIAS])
})

test('respuesta lenta marca "lento" (Render despertando)', async () => {
  const reloj = relojFalso()
  const estados = []
  let resolver
  const ciclo = crearCicloInicializacion({
    consultar: () => new Promise((r) => (resolver = r)),
    alCambiar: (e) => estados.push(e),
    ahora: reloj.ahora,
    programar: reloj.programar,
    cancelar: reloj.cancelar,
  })
  ciclo.iniciar()
  await reloj.siguiente() // vence umbralLento
  assert.equal(estados.at(-1).lento, true)
  assert.equal(estados.at(-1).estado, ESTADOS_INICIO.INITIALIZING)
  resolver({ tipo: RESULTADOS.LISTO })
  await vaciar()
  assert.equal(estados.at(-1).estado, ESTADOS_INICIO.READY)
})

test('error prolongado → ERROR y reintento manual sin recargar', async () => {
  const p = montar([{ tipo: RESULTADOS.CONECTANDO, demora: 30000 }])
  p.ciclo.iniciar()
  let guarda = 0
  while (p.ultimo().estado !== ESTADOS_INICIO.ERROR && guarda++ < 200) await p.reloj.siguiente()
  assert.equal(p.ultimo().estado, ESTADOS_INICIO.ERROR)
  assert.equal(p.reloj.pendientes.size, 0, 'no quedan temporizadores tras ERROR')

  const llamadasAntes = p.llamadas
  p.ciclo.reintentar()
  await vaciar()
  assert.ok(p.llamadas > llamadasAntes)
  assert.notEqual(p.ultimo().estado, ESTADOS_INICIO.ERROR)
})

test('reintentar no hace nada si no está en ERROR', async () => {
  const p = montar([{ tipo: RESULTADOS.CONECTANDO }])
  p.ciclo.iniciar()
  await vaciar()
  await vaciar()
  const llamadas = p.llamadas
  p.ciclo.reintentar()
  await vaciar()
  assert.equal(p.llamadas, llamadas)
  p.ciclo.detener()
})

test('detener cancela la solicitud en curso y los temporizadores', async () => {
  const reloj = relojFalso()
  let senal
  const estados = []
  const ciclo = crearCicloInicializacion({
    consultar: ({ signal }) =>
      new Promise((r) => {
        senal = signal
        signal.addEventListener('abort', () => r({ tipo: 'CANCELADO' }))
      }),
    alCambiar: (e) => estados.push(e),
    ahora: reloj.ahora,
    programar: reloj.programar,
    cancelar: reloj.cancelar,
  })
  ciclo.iniciar()
  await vaciar()
  ciclo.detener()
  await vaciar()
  assert.equal(senal.aborted, true)
  assert.equal(reloj.pendientes.size, 0)
  assert.ok(!estados.some((e) => e.estado === ESTADOS_INICIO.WAITING))
})

test('despertar acorta la espera entre intentos', async () => {
  const p = montar([{ tipo: RESULTADOS.CONECTANDO }, { tipo: RESULTADOS.LISTO }])
  p.ciclo.iniciar()
  await vaciar()
  await vaciar()
  assert.equal(p.ultimo().estado, ESTADOS_INICIO.WAITING)
  p.ciclo.despertar()
  await vaciar()
  await vaciar()
  await vaciar()
  assert.equal(p.ultimo().estado, ESTADOS_INICIO.READY)
})

test('iniciar dos veces no duplica el ciclo (StrictMode)', async () => {
  const p = montar([{ tipo: RESULTADOS.CONECTANDO }])
  p.ciclo.iniciar()
  p.ciclo.iniciar()
  await vaciar()
  await vaciar()
  assert.equal(p.llamadas, 1)
  p.ciclo.detener()
})
