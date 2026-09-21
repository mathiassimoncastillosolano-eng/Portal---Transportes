import './tarjetaServicio.css'

const ICONOS = {
  asiento: (
    <path d="M6 4v9a2 2 0 0 0 2 2h1v3M17 4v9a2 2 0 0 1-2 2h-1v3M9 15h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'asiento-plus': (
    <path d="M6 3v10a2 2 0 0 0 2 2h1v3M17 3v10a2 2 0 0 1-2 2h-1v3M9 15h6M12 6v4M10 8h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  cama: (
    <path d="M3 17v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 17v2M21 17v2M3 13h18M6 11V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  estrella: (
    <path d="M12 3.5 14.5 9l6 .8-4.4 4 1.1 5.9-5.2-2.9-5.2 2.9 1.1-5.9-4.4-4 6-.8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  ),
  corona: (
    <path d="M4 8l3 3 5-6 5 6 3-3-1.5 9h-13L4 8Zm2.5 11h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  ),
}

export function TarjetaServicio({ servicio }) {
  return (
    <article className="tarjeta-servicio">
      <div className="tarjeta-servicio__imagen">
        <img src={servicio.imagen} alt={`Interior de bus ${servicio.nombre}`} loading="lazy" />
      </div>
      <div className="tarjeta-servicio__cuerpo">
        <span className="tarjeta-servicio__icono">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            {ICONOS[servicio.icono]}
          </svg>
        </span>
        <h3 className="tarjeta-servicio__nombre">{servicio.nombre}</h3>
        <p className="tarjeta-servicio__descripcion">{servicio.descripcion}</p>
        <p className="tarjeta-servicio__caracteristica">{servicio.caracteristica}</p>
      </div>
    </article>
  )
}
