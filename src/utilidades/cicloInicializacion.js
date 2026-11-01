// Ciclo de comprobación de disponibilidad (polling controlado), sin React ni DOM.
//
// Garantías:
//  · Nunca hay dos comprobaciones simultáneas: cada intento espera al anterior.
//  · Un 503 / 502 / 504 / timeout / error de red NO detiene el ciclo: es lo esperado mientras
//    Render despierta y Spring Boot arranca. Solo se pasa a ERROR al agotar `limiteEspera`.
//  · Espera entre intentos con backoff progresivo y variación aleatoria (ver calcularEspera).
//  · `detener()` cancela la solicitud en curso y todos los temporizadores.
//  · `reintentar()` (solo desde ERROR) reinicia el ciclo sin recargar la página.
//  · `despertar()` acorta la espera actual (p. ej. al recuperar la conexión a internet).

import {
  ESTADOS_INICIO,
  RESULTADOS,
  TIEMPOS_INICIO,
  calcularEspera,
  esperaAgotada,
} from './inicializacion.js'

/**
 * @param {object} opciones
 * @param {(o: { signal: AbortSignal }) => Promise<{ tipo: string }>} opciones.consultar
 * @param {(estado: { estado: string, tipo: string|null, lento: boolean, intentos: number }) => void} opciones.alCambiar
 */
export function crearCicloInicializacion({
  consultar,
  alCambiar,
  tiempos = TIEMPOS_INICIO,
  ahora = () => Date.now(),
  programar = (fn, ms) => setTimeout(fn, ms),
  cancelar = (id) => clearTimeout(id),
  aleatorio = Math.random,
}) {
  let estado = { estado: ESTADOS_INICIO.INITIALIZING, tipo: null, lento: false, intentos: 0 }
  let generacion = 0 // invalida ciclos anteriores tras detener()/reintentar()
  let enMarcha = false
  let controlador = null
  let temporizadorLento = null
  let esperaActual = null // { id, resolver }

  function emitir(cambios) {
    estado = { ...estado, ...cambios }
    alCambiar(estado)
  }

  function limpiarTemporizadores() {
    if (temporizadorLento !== null) cancelar(temporizadorLento)
    temporizadorLento = null
    if (esperaActual) {
      cancelar(esperaActual.id)
      esperaActual.resolver()
      esperaActual = null
    }
  }

  function dormir(ms) {
    return new Promise((resolver) => {
      const id = programar(() => {
        esperaActual = null
        resolver()
      }, ms)
      esperaActual = { id, resolver }
    })
  }

  async function ejecutar(miGeneracion) {
    const inicio = ahora()
    const vigente = () => miGeneracion === generacion

    while (vigente()) {
      controlador = new AbortController()
      // Si la primera respuesta tarda, casi seguro Render está despertando el servicio.
      if (!estado.lento) {
        temporizadorLento = programar(() => {
          temporizadorLento = null
          if (vigente() && estado.estado !== ESTADOS_INICIO.READY) emitir({ lento: true })
        }, tiempos.umbralLento)
      }

      const resultado = await consultar({ signal: controlador.signal })
      if (temporizadorLento !== null) cancelar(temporizadorLento)
      temporizadorLento = null
      controlador = null

      if (!vigente() || resultado?.tipo === 'CANCELADO') return

      if (resultado.tipo === RESULTADOS.LISTO) {
        enMarcha = false
        emitir({ estado: ESTADOS_INICIO.READY, tipo: RESULTADOS.LISTO })
        return
      }

      const intentos = estado.intentos + 1
      if (esperaAgotada(ahora() - inicio, tiempos)) {
        enMarcha = false
        emitir({ estado: ESTADOS_INICIO.ERROR, tipo: resultado.tipo, intentos })
        return
      }

      emitir({ estado: ESTADOS_INICIO.WAITING, tipo: resultado.tipo, intentos })
      await dormir(calcularEspera(intentos, aleatorio(), tiempos))
    }
  }

  function iniciar() {
    if (enMarcha || estado.estado === ESTADOS_INICIO.READY) return
    enMarcha = true
    generacion += 1
    emitir({ estado: ESTADOS_INICIO.INITIALIZING, tipo: null, lento: false, intentos: 0 })
    ejecutar(generacion)
  }

  return {
    iniciar,
    reintentar() {
      if (estado.estado !== ESTADOS_INICIO.ERROR) return
      iniciar()
    },
    despertar() {
      if (esperaActual) {
        const { id, resolver } = esperaActual
        esperaActual = null
        cancelar(id)
        resolver()
      }
    },
    detener() {
      generacion += 1
      enMarcha = false
      controlador?.abort()
      controlador = null
      limpiarTemporizadores()
    },
    obtenerEstado: () => estado,
  }
}
