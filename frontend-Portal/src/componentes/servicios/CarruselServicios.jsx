import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TarjetaServicio } from './TarjetaServicio'
import './carruselServicios.css'

const VELOCIDAD_AUTOMATICA_PX_S = 34
const REPETICIONES_INICIALES = 2
const REPETICIONES_MAXIMAS = 12

/**
 * Carrusel horizontal infinito y automático para las tarjetas de Servicios.
 *
 * - Se mueve solo, de derecha a izquierda, de forma lenta y continua.
 * - El usuario puede arrastrar con mouse o con el dedo en ambas direcciones;
 *   el movimiento automático le cede el control mientras arrastra y vuelve
 *   a retomarlo suavemente al soltar (sin saltos, porque nunca se
 *   reposiciona el contenido, solo se pausa el avance automático).
 * - El listado de servicios se repite tantas veces como haga falta para
 *   que el recorrido nunca muestre un hueco, sin importar si son 4 o 50.
 * - No usa `overflow-x` nativo: todo el desplazamiento es un `transform`
 *   dentro de un contenedor con `overflow: hidden`, así que jamás agrega
 *   scroll horizontal a la página.
 */
export function CarruselServicios({ servicios }) {
  const contenedorRef = useRef(null)
  const pistaRef = useRef(null)
  const posicionRef = useRef(0)
  const anchoConjuntoRef = useRef(0)
  const arrastrandoRef = useRef(false)
  const inicioPunteroXRef = useRef(0)
  const inicioPosicionRef = useRef(0)
  const cuadroRef = useRef(null)

  const [repeticiones, setRepeticiones] = useState(REPETICIONES_INICIALES)
  const [arrastrando, setArrastrando] = useState(false)

  const hayServicios = servicios && servicios.length > 0
  const listaRepetida = hayServicios
    ? Array.from({ length: repeticiones }, () => servicios).flat()
    : []

  // Calcula cuántas repeticiones del listado hacen falta para que el
  // recorrido cubra siempre el ancho visible, sin dejar huecos, sin
  // importar cuántos servicios existan ni el ancho de la pantalla.
  useLayoutEffect(() => {
    if (!hayServicios) return undefined

    function recalcular() {
      const contenedor = contenedorRef.current
      const pista = pistaRef.current
      if (!contenedor || !pista) return

      const anchoConjunto = pista.scrollWidth / repeticiones
      if (!anchoConjunto) return

      anchoConjuntoRef.current = anchoConjunto

      const anchoContenedor = contenedor.offsetWidth
      const necesarias = Math.min(
        REPETICIONES_MAXIMAS,
        Math.max(2, Math.ceil(anchoContenedor / anchoConjunto) + 2)
      )

      if (necesarias !== repeticiones) {
        setRepeticiones(necesarias)
      }
    }

    recalcular()

    const observador = new ResizeObserver(recalcular)
    observador.observe(contenedorRef.current)
    window.addEventListener('resize', recalcular)

    return () => {
      observador.disconnect()
      window.removeEventListener('resize', recalcular)
    }
  }, [repeticiones, hayServicios, servicios])

  // Bucle de animación: mueve la pista automáticamente y aplica el
  // arrastre del usuario, todo mediante un único `transform` por cuadro.
  useEffect(() => {
    if (!hayServicios) return undefined

    const prefiereMenosMovimiento = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const velocidad = prefiereMenosMovimiento ? 0 : VELOCIDAD_AUTOMATICA_PX_S

    let anterior = performance.now()

    function normalizar(posicion) {
      const anchoConjunto = anchoConjuntoRef.current
      if (!anchoConjunto) return posicion
      let resultado = posicion % anchoConjunto
      if (resultado > 0) resultado -= anchoConjunto
      return resultado
    }

    function paso(ahora) {
      const delta = Math.min(0.05, (ahora - anterior) / 1000)
      anterior = ahora

      if (!arrastrandoRef.current) {
        posicionRef.current -= velocidad * delta
      }

      posicionRef.current = normalizar(posicionRef.current)

      if (pistaRef.current) {
        pistaRef.current.style.transform = `translate3d(${posicionRef.current}px, 0, 0)`
      }

      cuadroRef.current = requestAnimationFrame(paso)
    }

    cuadroRef.current = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(cuadroRef.current)
  }, [hayServicios])

  function manejarPunteroAbajo(evento) {
    if (evento.pointerType === 'mouse' && evento.button !== 0) return
    arrastrandoRef.current = true
    inicioPunteroXRef.current = evento.clientX
    inicioPosicionRef.current = posicionRef.current
    setArrastrando(true)
    pistaRef.current?.setPointerCapture(evento.pointerId)
  }

  function manejarPunteroMover(evento) {
    if (!arrastrandoRef.current) return
    const delta = evento.clientX - inicioPunteroXRef.current
    posicionRef.current = inicioPosicionRef.current + delta
  }

  function soltarArrastre(evento) {
    if (!arrastrandoRef.current) return
    arrastrandoRef.current = false
    setArrastrando(false)
    if (pistaRef.current?.hasPointerCapture?.(evento.pointerId)) {
      pistaRef.current.releasePointerCapture(evento.pointerId)
    }
  }

  if (!hayServicios) return null

  return (
    <div className="carrusel-servicios" ref={contenedorRef}>
      <div
        className={`carrusel-servicios__pista ${arrastrando ? 'carrusel-servicios__pista--arrastrando' : ''}`}
        ref={pistaRef}
        onPointerDown={manejarPunteroAbajo}
        onPointerMove={manejarPunteroMover}
        onPointerUp={soltarArrastre}
        onPointerCancel={soltarArrastre}
        role="region"
        aria-label="Servicios disponibles, desliza para explorar"
      >
        {listaRepetida.map((servicio, indice) => (
          <div
            className="carrusel-servicios__item"
            key={`${servicio.id}-${indice}`}
            aria-hidden={indice >= servicios.length ? 'true' : undefined}
          >
            <TarjetaServicio servicio={servicio} />
          </div>
        ))}
      </div>
    </div>
  )
}
