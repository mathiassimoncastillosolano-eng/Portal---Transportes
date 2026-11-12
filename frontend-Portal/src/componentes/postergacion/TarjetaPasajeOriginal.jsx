import { EstadoDisponibilidad } from '../comunes/EstadoDisponibilidad'
import { formatearFechaCorta, formatearFechaHoraCompra, formatearPrecio } from '../../utilidades/formato'

const ESTADOS = {
  VIGENTE: { clave: 'confirmado', etiqueta: 'Vigente' },
  USADO: { clave: 'completado', etiqueta: 'Utilizado' },
  CANCELADO: { clave: 'cancelado', etiqueta: 'Cancelado' },
  NO_VALIDO: { clave: 'SIN_INFORMACION', etiqueta: 'No válido' },
}

export function TarjetaPasajeOriginal({ pasaje, titulo = 'Pasaje a cambiar' }) {
  const estado = ESTADOS[pasaje.estado] ?? ESTADOS.NO_VALIDO

  return (
    <article className="pasaje-original" aria-label={titulo}>
      <div className="pasaje-original__lado">
        <span className="pasaje-original__etiqueta">{titulo}</span>
        <strong className="pasaje-original__codigo">{pasaje.numeroBoleto}</strong>
        <EstadoDisponibilidad estado={estado.clave} etiqueta={estado.etiqueta} />
      </div>
      <div className="pasaje-original__ruta">
        <span className="pasaje-original__ciudad">{pasaje.origen}</span>
        <span className="pasaje-original__flecha" aria-hidden="true">
          <svg width="36" height="12" viewBox="0 0 36 12" fill="none">
            <path d="M1 6h32m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="pasaje-original__ciudad">{pasaje.destino}</span>
      </div>
      <dl className="pasaje-original__datos">
        <div><dt>Fecha</dt><dd>{formatearFechaCorta(pasaje.fechaSalida)}</dd></div>
        <div><dt>Salida</dt><dd>{pasaje.horaSalida}</dd></div>
        <div><dt>Asiento</dt><dd>{pasaje.asiento}</dd></div>
        <div><dt>Pagado</dt><dd>{formatearPrecio(pasaje.precioPagado, pasaje.moneda)}</dd></div>
        {pasaje.fechaCompra && <div><dt>Comprado</dt><dd>{formatearFechaHoraCompra(pasaje.fechaCompra)}</dd></div>}
      </dl>
    </article>
  )
}
