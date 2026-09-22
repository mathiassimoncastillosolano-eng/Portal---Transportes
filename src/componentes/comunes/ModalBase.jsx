import { useEffect } from 'react'
import './modalBase.css'

export function ModalBase({ titulo, subtitulo, abierto, alCerrar, children }) {
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
    <div className="modal-base__fondo" role="presentation" onMouseDown={alCerrar}>
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
