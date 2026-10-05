import { formatearFechaLarga } from '../../utilidades/formato'
import './infoViajeCompacta.css'

export function InfoViajeCompacta({ resultado, fecha }) {
  return (
    <div className="info-viaje-compacta">
      <div className="info-viaje-compacta__cabecera">
        <p className="info-viaje-compacta__fecha">{formatearFechaLarga(fecha)}</p>
        <dl className="info-viaje-compacta__servicio">
          <div>
            <dt>Servicio</dt>
            <dd>{resultado.empresa}</dd>
          </div>
        </dl>
      </div>

      <div className="info-viaje-compacta__ruta">
        <span className="info-viaje-compacta__ciudad">{resultado.origen}</span>
        <span className="info-viaje-compacta__trayecto" aria-hidden="true">
          <span className="info-viaje-compacta__punto" />
          <span className="info-viaje-compacta__linea" />
          <svg className="info-viaje-compacta__bus" width="34" height="34" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="13" rx="3" stroke="currentColor" strokeWidth="1.6" />
            <path d="M4 11h16M8 20v-3M16 20v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="8" cy="14" r=".9" fill="currentColor" />
            <circle cx="16" cy="14" r=".9" fill="currentColor" />
          </svg>
          <span className="info-viaje-compacta__linea" />
          <span className="info-viaje-compacta__punto info-viaje-compacta__punto--destino" />
        </span>
        <span className="info-viaje-compacta__ciudad info-viaje-compacta__ciudad--destino">{resultado.destino}</span>
      </div>

      <dl className="info-viaje-compacta__horarios">
        <div className="info-viaje-compacta__horario">
          <dt>Salida</dt>
          <dd>{resultado.horaSalida}</dd>
        </div>
        <div className="info-viaje-compacta__horario info-viaje-compacta__horario--duracion">
          <dt>Duración</dt>
          <dd>{resultado.duracion}</dd>
        </div>
        <div className="info-viaje-compacta__horario info-viaje-compacta__horario--llegada">
          <dt>Llegada</dt>
          <dd>{resultado.horaLlegada}</dd>
        </div>
      </dl>
    </div>
  )
}
