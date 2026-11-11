import './tarjetaServicio.css'

// La API entrega el nombre del tipo de bus, pero no un icono. Elegimos uno
// visualmente representativo sin agregar una columna a la base de datos.
const ICONOS_POR_SERVICIO = {
  estandar: <>
    <rect x="3" y="5" width="18" height="13" rx="3" />
    <path d="M3 11h18M7 18v2m10-2v2M7 8h3m4 0h3" />
  </>,
  economico: <>
    <rect x="3" y="5" width="18" height="13" rx="3" />
    <path d="M3 11h18M7 18v2m10-2v2M7 8h3m4 0h3" />
  </>,
  'semi cama': <>
    <path d="M8 3v8a3 3 0 0 0 3 3h6M5 11v5a3 3 0 0 0 3 3h11" />
    <path d="M8 4a2 2 0 0 1 2 2v5M5 16h14v4" />
  </>,
  'bus cama': <>
    <path d="M3 19V7m0 10h18v2M6 13h15v4H3v-2a2 2 0 0 1 2-2h1Z" />
    <path d="M6 10h4a2 2 0 0 1 2 2v1H6v-3Z" />
  </>,
  prime: <>
    <path d="m3 8 4.5 3 4.5-6 4.5 6L21 8l-2 10H5L3 8Z" />
    <path d="M5 21h14" />
  </>,
  ultra: <>
    <path d="m3 8 4.5 3 4.5-6 4.5 6L21 8l-2 10H5L3 8Z" />
    <path d="M5 21h14" />
  </>,
}

const ICONO_PREDETERMINADO = (
  <path d="M12 3.5 14.5 9l6 .8-4.4 4 1.1 5.9-5.2-2.9-5.2 2.9 1.1-5.9-4.4-4 6-.8Z" />
)

function iconoParaServicio(nombre) {
  const clave = (nombre ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  return ICONOS_POR_SERVICIO[clave] ?? ICONO_PREDETERMINADO
}

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
        <span className="tarjeta-servicio__icono" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {iconoParaServicio(servicio.nombre)}
          </svg>
        </span>
        <h3 className="tarjeta-servicio__nombre">{servicio.nombre}</h3>
        <p className="tarjeta-servicio__descripcion">{servicio.descripcion}</p>
        <p className="tarjeta-servicio__caracteristica">{servicio.caracteristica}</p>
      </div>
    </article>
  )
}
