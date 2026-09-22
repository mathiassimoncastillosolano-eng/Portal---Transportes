import { formatearFechaLarga } from '../../utilidades/formato'
import './infoViajeCompacta.css'

export function InfoViajeCompacta({ resultado, fecha }) {
  return (
    <div className="info-viaje-compacta">
      <div className="info-viaje-compacta__ruta">
        <span>{resultado.origen}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{resultado.destino}</span>
      </div>

      <p className="info-viaje-compacta__fecha">{formatearFechaLarga(fecha)}</p>

      <dl className="info-viaje-compacta__detalles">
        <div>
          <dt>Salida</dt>
          <dd>{resultado.horaSalida}</dd>
        </div>
        <div>
          <dt>Llegada</dt>
          <dd>{resultado.horaLlegada}</dd>
        </div>
        <div>
          <dt>Duración</dt>
          <dd>{resultado.duracion}</dd>
        </div>
        <div>
          <dt>Servicio</dt>
          <dd>{resultado.empresa}</dd>
        </div>
      </dl>
    </div>
  )
}
