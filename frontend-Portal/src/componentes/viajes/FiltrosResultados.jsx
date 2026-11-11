import './filtrosResultados.css'

// Cada franja lleva su propio ícono para que el filtro se lea de un
// vistazo (silueta del momento del día) en vez de depender solo del texto,
// como pediría un formulario administrativo.
function IconoMadrugada() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 14.5A8 8 0 1 1 11 4a6.3 6.3 0 0 0 9 10.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M16 3.5v2.4M19.8 5.7l-1.7 1.7M14.2 5.7l1.7 1.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconoManana() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17h16M12 6v2.2M6.2 9 7.7 10.4M17.8 9l-1.5 1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 17a5 5 0 0 1 10 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function IconoTarde() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 3v2.1M12 18.9V21M4.4 12H6.5M17.5 12h2.1M6.4 6.4l1.5 1.5M16.1 16.1l1.5 1.5M6.4 17.6l1.5-1.5M16.1 7.9l1.5-1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconoNoche() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.2 14.7A8.2 8.2 0 1 1 9.3 3.8a6.6 6.6 0 0 0 10.9 10.9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

export const FRANJAS_HORARIO = [
  { id: 'madrugada', etiqueta: 'Madrugada', detalle: '00:00 – 05:59', Icono: IconoMadrugada },
  { id: 'mañana', etiqueta: 'Mañana', detalle: '06:00 – 11:59', Icono: IconoManana },
  { id: 'tarde', etiqueta: 'Tarde', detalle: '12:00 – 18:59', Icono: IconoTarde },
  { id: 'noche', etiqueta: 'Noche', detalle: '19:00 – 23:59', Icono: IconoNoche },
]

/**
 * Barra de filtros de resultados. El horario se presenta como un grupo de
 * franjas con ícono propio (en vez de un listado de texto plano) para que
 * el usuario elija de un vistazo; el tipo de servicio usa chips con scroll
 * horizontal para que la interfaz escale sin volverse una lista larga.
 */
export function FiltrosResultados({
  horario,
  alCambiarHorario,
  serviciosDisponibles,
  serviciosSeleccionados,
  alAlternarServicio,
  hayFiltrosActivos,
  alLimpiarFiltros,
}) {
  return (
    <div className="filtros-resultados">
      <div className="filtros-resultados__fila filtros-resultados__fila--encabezado">
        <h2 className="filtros-resultados__titulo">Filtrar</h2>
        {hayFiltrosActivos && (
          <button type="button" className="filtros-resultados__limpiar" onClick={alLimpiarFiltros}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="filtros-resultados__grupo">
        <span className="filtros-resultados__etiqueta">Hora de salida</span>
        <div className="filtros-resultados__franjas">
          {FRANJAS_HORARIO.map(({ id, etiqueta, detalle, Icono }) => {
            const activo = horario === id
            return (
              <button
                key={id}
                type="button"
                className={`filtros-resultados__franja ${activo ? 'filtros-resultados__franja--activa' : ''}`}
                aria-pressed={activo}
                onClick={() => alCambiarHorario(activo ? 'cualquiera' : id)}
              >
                <span className="filtros-resultados__franja-icono"><Icono /></span>
                <span className="filtros-resultados__franja-textos">
                  <span className="filtros-resultados__franja-etiqueta">{etiqueta}</span>
                  <span className="filtros-resultados__franja-detalle">{detalle}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="filtros-resultados__grupo">
        <span className="filtros-resultados__etiqueta">Tipo de servicio</span>
        <div className="filtros-resultados__chips filtros-resultados__chips--scroll">
          <button
            type="button"
            className={`filtros-resultados__chip ${serviciosSeleccionados.size === 0 ? 'filtros-resultados__chip--activo' : ''}`}
            aria-pressed={serviciosSeleccionados.size === 0}
            onClick={() => alAlternarServicio(null)}
          >
            Todos
          </button>
          {serviciosDisponibles.map((servicio) => (
            <button
              key={servicio}
              type="button"
              className={`filtros-resultados__chip ${serviciosSeleccionados.has(servicio) ? 'filtros-resultados__chip--activo' : ''}`}
              aria-pressed={serviciosSeleccionados.has(servicio)}
              onClick={() => alAlternarServicio(servicio)}
            >
              {servicio}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
