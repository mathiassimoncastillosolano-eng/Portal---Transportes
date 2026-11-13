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
  const [anio, mes, dia] = pasaje.fechaSalida.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  const nombreMes = fecha.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '').toUpperCase()
  const diaSemana = fecha.toLocaleDateString('es-PE', { weekday: 'long' })

  return (
    <article className="pasaje-original" aria-label={titulo}>
      <time className="pasaje-original__fecha" dateTime={pasaje.fechaSalida} aria-label={formatearFechaCorta(pasaje.fechaSalida)}>
        <span className="pasaje-original__mes">{nombreMes}</span>
        <strong className="pasaje-original__dia">{dia}</strong>
        <span className="pasaje-original__anio">{anio}</span>
        <span className="pasaje-original__semana">{diaSemana}</span>
      </time>

      <div className="pasaje-original__contenido">
        <div className="pasaje-original__cabecera">
          <div className="pasaje-original__identidad">
            <span className="pasaje-original__etiqueta">{titulo}</span>
            <strong className="pasaje-original__codigo">{pasaje.numeroBoleto}</strong>
          </div>
          <EstadoDisponibilidad estado={estado.clave} etiqueta={estado.etiqueta} />
        </div>
        <div className="pasaje-original__trayecto">
          <div className="pasaje-original__parada">
            <span className="pasaje-original__punto" aria-hidden="true" />
            <div><strong>{pasaje.origen}</strong><span>Salida {pasaje.horaSalida}</span></div>
          </div>
          <div className="pasaje-original__parada">
            <span className="pasaje-original__punto pasaje-original__punto--destino" aria-hidden="true" />
            <div><strong>{pasaje.destino}</strong><span>Destino</span></div>
          </div>
        </div>
      </div>

      <dl className="pasaje-original__datos">
        <div><dt>Asiento</dt><dd>{pasaje.asiento}</dd></div>
        <div><dt>Pagado</dt><dd className="pasaje-original__precio">{formatearPrecio(pasaje.precioPagado, pasaje.moneda)}</dd></div>
        {pasaje.fechaCompra && <div><dt>Comprado</dt><dd>{formatearFechaHoraCompra(pasaje.fechaCompra)}</dd></div>}
      </dl>
    </article>
  )
}
