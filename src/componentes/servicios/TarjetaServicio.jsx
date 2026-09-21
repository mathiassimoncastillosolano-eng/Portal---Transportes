import './tarjetaServicio.css'

// Todas las tarjetas de servicio usan el mismo icono de estrella verde:
// es un elemento visual fijo del componente y no depende de ningún dato
// recibido desde la API (ni del nombre, ni del id, ni de ningún otro
// campo del tipo de bus).
const ICONO_ESTRELLA = (
  <path d="M12 3.5 14.5 9l6 .8-4.4 4 1.1 5.9-5.2-2.9-5.2 2.9 1.1-5.9-4.4-4 6-.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
)

export function TarjetaServicio({ servicio }) {
  function manejarErrorImagen(evento) {
    // Si la URL de la imagen del tipo de bus está vacía, es inválida o
    // no carga, se oculta la etiqueta <img> en vez de romper la
    // tarjeta o mostrar el ícono roto por defecto del navegador.
    evento.currentTarget.style.display = 'none'
  }

  return (
    <article className="tarjeta-servicio">
      <div className="tarjeta-servicio__imagen">
        {servicio.imagen && (
          <img
            src={servicio.imagen}
            alt={`Interior de bus ${servicio.nombre}`}
            loading="lazy"
            onError={manejarErrorImagen}
          />
        )}
      </div>
      <div className="tarjeta-servicio__cuerpo">
        <span className="tarjeta-servicio__icono">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            {ICONO_ESTRELLA}
          </svg>
        </span>
        <h3 className="tarjeta-servicio__nombre">{servicio.nombre}</h3>
        <p className="tarjeta-servicio__descripcion">{servicio.descripcion}</p>
        <p className="tarjeta-servicio__caracteristica">{servicio.caracteristica}</p>
      </div>
    </article>
  )
}
