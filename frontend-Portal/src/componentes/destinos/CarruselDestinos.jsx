import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { TarjetaDestino } from './TarjetaDestino'
import './carruselDestinos.css'

const ESPACIO_ENTRE_TARJETAS = 24

/**
 * Carrusel horizontal manual (sin autoplay) para la sección de Destinos.
 * El desplazamiento se apoya en el scroll nativo del navegador (soporta
 * swipe táctil de forma gratuita) y expone `desplazar(direccion)` para
 * que las flechas del encabezado lo controlen mediante una ref.
 */
export const CarruselDestinos = forwardRef(function CarruselDestinos(
  { destinos, onEstadoCambio },
  referenciaExterna
) {
  const referenciaPista = useRef(null)

  function calcularEstado() {
    const pista = referenciaPista.current
    if (!pista) return { puedeIrAtras: false, puedeIrAdelante: false }
    const maximoScroll = pista.scrollWidth - pista.clientWidth
    return {
      puedeIrAtras: pista.scrollLeft > 4,
      puedeIrAdelante: pista.scrollLeft < maximoScroll - 4,
    }
  }

  useEffect(() => {
    const pista = referenciaPista.current
    if (!pista) return

    const notificar = () => onEstadoCambio?.(calcularEstado())
    notificar()

    pista.addEventListener('scroll', notificar, { passive: true })
    window.addEventListener('resize', notificar)
    return () => {
      pista.removeEventListener('scroll', notificar)
      window.removeEventListener('resize', notificar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinos])

  useImperativeHandle(referenciaExterna, () => ({
    desplazar(direccion) {
      const pista = referenciaPista.current
      if (!pista) return
      const primeraTarjeta = pista.querySelector('.carrusel-destinos__item')
      const anchoTarjeta = primeraTarjeta
        ? primeraTarjeta.getBoundingClientRect().width
        : pista.clientWidth / 2
      const distancia = (anchoTarjeta + ESPACIO_ENTRE_TARJETAS) * 2
      pista.scrollBy({ left: direccion * distancia, behavior: 'smooth' })
    },
  }))

  return (
    <div className="carrusel-destinos__pista" ref={referenciaPista}>
      {destinos.map((destino) => (
        <div className="carrusel-destinos__item" key={destino.id}>
          <TarjetaDestino destino={destino} />
        </div>
      ))}
    </div>
  )
})
