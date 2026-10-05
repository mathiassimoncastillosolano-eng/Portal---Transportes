import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import './modalExpiracionReserva.css'

/**
 * Se muestra cuando location.state.sesionExpirada === true.
 * Es bloqueante: cubre la pantalla, impide el scroll y mantiene el foco
 * en "Aceptar". Solo se cierra con ese botón.
 */
export function ModalExpiracionReserva() {
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const botonRef = useRef(null)
  const visible = Boolean(ubicacion.state?.sesionExpirada)

  function cerrar() {
    navegar(`${ubicacion.pathname}${ubicacion.search}`, { replace: true, state: null })
  }

    useEffect(() => {
    if (!visible) return undefined
    botonRef.current?.focus()

    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function alPulsarTecla(evento) {
      if (evento.key === 'Escape') cerrar()
      // Único elemento enfocable: Tab no puede salir del modal
      if (evento.key === 'Tab') {
        evento.preventDefault()
        botonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', alPulsarTecla)
    return () => {
      window.removeEventListener('keydown', alPulsarTecla)
      document.body.style.overflow = overflowAnterior
    }
  }, [visible])

  if (!visible) return null

  return createPortal(
    <div className="modal-expiracion" role="presentation">
      <div
        className="modal-expiracion__caja"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-expiracion-titulo"
        aria-describedby="modal-expiracion-texto"
      >
        <h2 id="modal-expiracion-titulo" className="modal-expiracion__titulo">
          Expiración de la Sesión de la Reserva
        </h2>
        <p id="modal-expiracion-texto" className="modal-expiracion__texto">
          No se completó el registro de la reserva del viaje. Por favor, para completarlo, inténtelo nuevamente.
        </p>
        <button ref={botonRef} type="button" className="modal-expiracion__boton" onClick={cerrar}>
          Aceptar
        </button>
      </div>
    </div>,
    document.body,
  )
}