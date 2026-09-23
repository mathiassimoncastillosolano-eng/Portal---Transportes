import { NavLink } from 'react-router-dom'
import { ciudades } from '../../datos/ciudades'
import './pieDePagina.css'

// URLs de ejemplo: reemplazar por las cuentas reales de RutaLibre cuando
// estén disponibles. El componente ya queda listo para ese cambio.
const redesSociales = [
  {
    id: 'instagram',
    nombre: 'Instagram',
    url: 'https://instagram.com',
    etiquetaAccesible: 'Instagram de RutaLibre',
    icono: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5.5" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17.15" cy="6.85" r="1.1" fill="currentColor" />
      </>
    ),
  },
  {
    id: 'facebook',
    nombre: 'Facebook',
    url: 'https://facebook.com',
    etiquetaAccesible: 'Facebook de RutaLibre',
    icono: (
      <path
        d="M14.5 8.5h2V5.6h-2.3c-2.2 0-3.7 1.5-3.7 3.8v1.9H8.6v2.9h1.9V21h3V14.2h2.3l.4-2.9h-2.7V9.7c0-.8.3-1.2 1-1.2Z"
        fill="currentColor"
      />
    ),
  },
]

export function PieDePagina() {
  const anioActual = new Date().getFullYear()

  return (
    <footer className="pie-de-pagina">
      <div className="contenedor pie-de-pagina__interior">
        <div className="pie-de-pagina__columna pie-de-pagina__columna--marca">
          <div className="pie-de-pagina__marca">
            <span className="pie-de-pagina__isotipo">RL</span>
            <span className="pie-de-pagina__nombre">RutaLibre</span>
          </div>
          <p className="pie-de-pagina__descripcion">
            Conectamos el país con viajes cómodos, puntuales y seguros,
            todos los días del año.
          </p>

          <div className="pie-de-pagina__redes">
            {redesSociales.map((red) => (
              <a
                key={red.id}
                href={red.url}
                target="_blank"
                rel="noopener noreferrer"
                className="pie-de-pagina__red"
                aria-label={red.etiquetaAccesible}
                title={red.etiquetaAccesible}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  {red.icono}
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div className="pie-de-pagina__columna">
          <h3 className="pie-de-pagina__titulo">Empresa</h3>
          <NavLink to="/" className="pie-de-pagina__enlace">Inicio</NavLink>
          <NavLink to="/servicios" className="pie-de-pagina__enlace">Servicios</NavLink>
          <NavLink to="/ayuda" className="pie-de-pagina__enlace">Ayuda</NavLink>
        </div>

        <div className="pie-de-pagina__columna">
          <h3 className="pie-de-pagina__titulo">Destinos frecuentes</h3>
          {ciudades.slice(0, 5).map((ciudad) => (
            <NavLink key={ciudad} to="/destinos" className="pie-de-pagina__enlace">
              {ciudad}
            </NavLink>
          ))}
        </div>

        <div className="pie-de-pagina__columna">
          <h3 className="pie-de-pagina__titulo">Contacto</h3>
          <p className="pie-de-pagina__texto">Central: (01) 555 0192</p>
          <p className="pie-de-pagina__texto">ayuda@rutalibre.pe</p>
          <p className="pie-de-pagina__texto">Atención 24 horas, todos los días</p>
        </div>
      </div>

      <div className="contenedor pie-de-pagina__linea-inferior">
        <p>© {anioActual} RutaLibre. Todos los derechos reservados.</p>
        <p>Portal en desarrollo. Reservas y pagos en demostración.</p>
      </div>
    </footer>
  )
}
