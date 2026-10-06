const ICONO_CHECK = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 12.5 10 17l9-10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Columna de marca de las pantallas de autenticación.
 *
 * Antes este bloque estaba duplicado literalmente en PaginaIniciarSesion y
 * PaginaCrearCuenta; aquí se parametriza (título, texto y ventajas) para que
 * ambas pantallas compartan exactamente el mismo tratamiento visual y un
 * cambio de diseño solo haya que hacerlo en un sitio.
 */
export function PanelMarcaAutenticacion({ titulo, texto, ventajas = [] }) {
  return (
    <aside className="pagina-autenticacion__marca">
      <div className="pagina-autenticacion__marca-logo">
        <span className="pagina-autenticacion__marca-isotipo">RL</span>
        RutaLibre
      </div>

      <div className="pagina-autenticacion__marca-cuerpo">
        <h1 className="pagina-autenticacion__marca-titulo">{titulo}</h1>
        <p className="pagina-autenticacion__marca-texto">{texto}</p>
      </div>

      <ul className="pagina-autenticacion__marca-lista">
        {ventajas.map((ventaja) => (
          <li className="pagina-autenticacion__marca-item" key={ventaja}>
            <span className="pagina-autenticacion__marca-item-icono">{ICONO_CHECK}</span>
            {ventaja}
          </li>
        ))}
      </ul>
    </aside>
  )
}
