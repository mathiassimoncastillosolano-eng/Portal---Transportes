import { forwardRef } from 'react'
import { IconoAyuda } from './IconoAyuda'

export const BuscadorAyuda = forwardRef(function BuscadorAyuda({ valor, alCambiar, alLimpiar }, ref) {
  const manejarTecla = (evento) => {
    if (evento.key === 'Escape' && valor) {
      evento.stopPropagation()
      alLimpiar()
    }
  }

  return (
    <div className="centro-ayuda__buscador" role="search">
      <label className="centro-ayuda__buscador-etiqueta" htmlFor="centro-ayuda-busqueda">
        Buscar en el centro de ayuda
      </label>
      <span className="centro-ayuda__buscador-icono">
        <IconoAyuda nombre="buscar" tamano={18} />
      </span>
      <input
        id="centro-ayuda-busqueda"
        ref={ref}
        type="text"
        className="centro-ayuda__buscador-campo"
        placeholder="Busca por tema o escribe tu pregunta"
        value={valor}
        onChange={(evento) => alCambiar(evento.target.value)}
        onKeyDown={manejarTecla}
        autoComplete="off"
        spellCheck="false"
      />
      {valor && (
        <button type="button" className="centro-ayuda__buscador-limpiar" onClick={alLimpiar} aria-label="Borrar búsqueda">
          <IconoAyuda nombre="cerrar" tamano={16} />
        </button>
      )}
    </div>
  )
})
