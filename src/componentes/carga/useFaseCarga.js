import { useEffect, useRef, useState } from 'react'
import { elegirTiempos, esperaParaLlegar, secuenciaDeCierre } from '../../utilidades/tiemposCarga'

/**
 * Máquina de fases del cargador de RutaLibre. Convierte un booleano `cargando`
 * (que cambia cuando responde la API) en una secuencia visual estable:
 *
 *   contenido ──cargando──▶ viajando ──(recorrido cumplido)──▶ esperando
 *        ▲                      │                                  │
 *        │                      └────── cargando = false ──────────┤
 *        │                                                         ▼
 *        └── saliendo ◀── llegada (✓)  ◀─── (espera el mínimo si hizo falta)
 *
 *  · viajando  el bus avanza (≈1,5 s). Si la API termina antes, se espera lo
 *              que falte: nunca hay un destello loader → contenido.
 *  · esperando el bus ya llegó pero la operación sigue: permanece en el destino.
 *  · llegada   el destino confirma. No existe si la operación falló.
 *  · saliendo  el cargador se desvanece (≈260 ms) y entra el contenido.
 *  · pendiente (solo con `retardoMs`) la operación aún no justifica mostrar
 *              nada: si termina antes del retardo no se muestra el cargador.
 *
 * El bus NO se reinicia si `cargando` vuelve a ser true mientras el viaje aún
 * no terminó; solo reinicia si ya estaba en llegada/saliendo/contenido.
 *
 * Solo usa setTimeout (sin intervalos) y cada cambio de fase es un render.
 *
 * @param {boolean} cargando
 * @param {{ falla?: boolean, retardoMs?: number }} [opciones]
 * @returns {{ fase: string, ciclo: number, entrando: boolean }}
 */
export function useFaseCarga(cargando, { falla = false, retardoMs = 0 } = {}) {
  const faseInicial = cargando ? (retardoMs > 0 ? 'pendiente' : 'viajando') : 'contenido'
  const [fase, setFase] = useState(faseInicial)
  const [ciclo, setCiclo] = useState(0) // cambia en cada viaje nuevo: reinicia la animación SVG
  const [entrando, setEntrando] = useState(false) // true si el contenido llega tras un cargador

  const faseRef = useRef(faseInicial)
  const inicioRef = useRef(ahora())
  const fallaRef = useRef(falla)
  const temporizadores = useRef([])

  useEffect(() => {
    fallaRef.current = falla
  }, [falla])

  useEffect(() => limpiar, []) // eslint-disable-line react-hooks/exhaustive-deps

  function limpiar() {
    temporizadores.current.forEach(clearTimeout)
    temporizadores.current = []
  }

  function programar(accion, ms) {
    temporizadores.current.push(setTimeout(accion, ms))
  }

  function irA(nuevaFase) {
    faseRef.current = nuevaFase
    setFase(nuevaFase)
  }

  useEffect(() => {
    const tiempos = elegirTiempos(prefiereMenosMovimiento())

    // El bus llega al final del recorrido: si la operación sigue, espera.
    function programarEspera() {
      const falta = esperaParaLlegar({ transcurrido: ahora() - inicioRef.current, tiempos })
      programar(() => {
        if (faseRef.current === 'viajando') irA('esperando')
      }, falta)
    }

    function comenzarViaje() {
      inicioRef.current = ahora()
      setCiclo((c) => c + 1)
      setEntrando(false)
      irA('viajando')
      programarEspera()
    }

    function ejecutarCierre(pasos, indice) {
      if (indice >= pasos.length) {
        setEntrando(true)
        irA('contenido')
        return
      }
      irA(pasos[indice].fase)
      programar(() => ejecutarCierre(pasos, indice + 1), pasos[indice].duracion)
    }

    function cerrarViaje() {
      const falta = esperaParaLlegar({
        transcurrido: ahora() - inicioRef.current,
        falla: fallaRef.current,
        tiempos,
      })
      programar(() => ejecutarCierre(secuenciaDeCierre({ falla: fallaRef.current, tiempos }), 0), falta)
    }

    const actual = faseRef.current

    if (cargando) {
      limpiar() // cancela cualquier cierre pendiente: la operación (re)comenzó
      if (actual === 'pendiente') {
        programar(comenzarViaje, retardoMs)
      } else if (actual === 'viajando') {
        programarEspera() // continúa el mismo viaje, sin reiniciar el bus
      } else if (actual === 'esperando') {
        // el bus ya está en el destino: nada que reprogramar
      } else if (retardoMs > 0) {
        irA('pendiente')
        programar(comenzarViaje, retardoMs)
      } else {
        comenzarViaje()
      }
      return
    }

    if (actual === 'pendiente') {
      limpiar()
      irA('contenido') // terminó antes del retardo: no se muestra cargador
    } else if (actual === 'viajando' || actual === 'esperando') {
      limpiar()
      cerrarViaje()
    }
    // llegada / saliendo / contenido: el cierre ya está en curso o no hay nada que hacer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando])

  return { fase, ciclo, entrando }
}

function ahora() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function prefiereMenosMovimiento() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}
