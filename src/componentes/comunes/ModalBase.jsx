import { useEffect } from 'react'
import './modalBase.css'

// `cerrarAlPulsarFondo` (por defecto true) permite desactivar el cierre accidental al pulsar fuera,
// útil en flujos con progreso (p. ej. recuperar contraseña). Escape y la ✕ siguen cerrando.
export function ModalBase({ titulo, subtitulo, abierto, alCerrar, children, cerrarAlPulsarFondo = true }) {
  useEffect(() => {
    if (!abierto) return undefined
    const manejarTecla = (evento) => {
      if (evento.key === 'Escape') alCerrar()
    }
    document.addEventListener('keydown', manejarTecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', manejarTecla)
      document.body.style.overflow = ''
    }
  }, [abierto, alCerrar])

  if (!abierto) return null

  return (
    <div className="modal-base__fondo" role="presentation" onMouseDown={cerrarAlPulsarFondo ? alCerrar : undefined}>
      <div
        className="modal-base__panel animar-aparicion"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onMouseDown={(evento) => evento.stopPropagation()}
      >
        <button type="button" className="modal-base__cerrar" onClick={alCerrar} aria-label="Cerrar">
          ✕
        </button>
        <div className="modal-base__encabezado">
          <h2 className="modal-base__titulo">{titulo}</h2>
          {subtitulo && <p className="modal-base__subtitulo">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
