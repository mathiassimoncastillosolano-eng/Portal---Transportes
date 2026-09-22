import './ticketPasajero.css'

function IconoListo() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7.3 5.5 10.3 11.5 3.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconoEliminar() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Tarjeta tipo "ticket de viaje" que representa un asiento + su pasajero.
 * El estado (completo/pendiente) se comunica principalmente con color,
 * un ícono y el borde/franja lateral — el texto queda como refuerzo
 * discreto, no como el elemento visual dominante.
 * @param {{numero:string, piso:number}} asiento
 */
export function TicketPasajero({ asiento, mostrarPiso, completo, nombrePreview, activo, onSeleccionar, onEliminar }) {
  const descripcionEstado = completo ? `completo${nombrePreview ? `, ${nombrePreview}` : ''}` : 'pendiente de completar'

  return (
    <div className={`ticket-pasajero ${activo ? 'ticket-pasajero--activo' : ''} ${completo ? 'ticket-pasajero--completo' : ''}`}>
      <button
        type="button"
        className="ticket-pasajero__cuerpo"
        onClick={onSeleccionar}
        aria-pressed={activo}
        aria-label={`Asiento ${asiento.numero}${mostrarPiso ? `, piso ${asiento.piso}` : ''}, ${descripcionEstado}`}
      >
        <span className="ticket-pasajero__franja" aria-hidden="true" />

        <span className="ticket-pasajero__cabecera">
          <span className="ticket-pasajero__marca">
            <span className="ticket-pasajero__marca-punto" aria-hidden="true" />
            RutaLibre
          </span>
          <span className="ticket-pasajero__estado-icono" aria-hidden="true">
            {completo ? <IconoListo /> : <span className="ticket-pasajero__estado-punto" />}
          </span>
        </span>

        <span className="ticket-pasajero__asiento">
          Asiento {asiento.numero}
          {mostrarPiso && <span className="ticket-pasajero__piso"> · Piso {asiento.piso}</span>}
        </span>

        <span className="ticket-pasajero__pie">
          {completo && nombrePreview ? nombrePreview : 'Sin completar'}
        </span>
      </button>

      <button
        type="button"
        className="ticket-pasajero__eliminar"
        onClick={onEliminar}
        aria-label={`Quitar asiento ${asiento.numero}`}
        title="Quitar asiento"
      >
        <IconoEliminar />
      </button>
    </div>
  )
}
