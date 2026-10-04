import { EstadoDisponibilidad } from '../comunes/EstadoDisponibilidad'
import { formatearFechaCorta, formatearPrecio } from '../../utilidades/formato'
import './tarjetaPasaje.css'

export function TarjetaPasaje({ compra, onVerDetalle }) {
  return (
    <article className="tarjeta-pasaje">
      <div className="tarjeta-pasaje__cabecera">
        <span className="tarjeta-pasaje__codigo">COMPRA</span>
        <EstadoDisponibilidad estado={compra.estado} />
      </div>
      <div className="tarjeta-pasaje__ruta">
        <span>{compra.origen}</span><span aria-hidden="true">→</span><span>{compra.destino}</span>
      </div>
      <p className="tarjeta-pasaje__fecha">{formatearFechaCorta(compra.fecha)} · {compra.hora}</p>
      <div className="tarjeta-pasaje__resumen">
        <div><small>Servicio</small><strong>{compra.tipoBus}</strong></div>
        <div><small>Asientos</small><strong>{compra.boletos.map((b) => b.asiento).join(', ')}</strong></div>
        <div><small>Total</small><strong>{formatearPrecio(compra.total)}</strong></div>
      </div>
      <button type="button" className="tarjeta-pasaje__ver-boleto" onClick={onVerDetalle}>
        Ver detalle y boletos <span aria-hidden="true">→</span>
      </button>
    </article>
  )
}
