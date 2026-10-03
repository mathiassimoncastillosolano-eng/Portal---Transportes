import { EstadoDisponibilidad } from '../comunes/EstadoDisponibilidad'
import { formatearFechaLarga, formatearPrecio } from '../../utilidades/formato'
import './tarjetaTicket.css'

export function TarjetaTicket({ compra, onDescargar, descargando, errorPdf, demostracion }) {
  return (
    <article className="tarjeta-ticket">
      <div className="tarjeta-ticket__franja">
        <span className="tarjeta-ticket__marca"><span className="tarjeta-ticket__isotipo">RL</span> RutaLibre</span>
        <EstadoDisponibilidad estado={compra.estado} />
      </div>
      <div className="tarjeta-ticket__cuerpo">
          <p className="tarjeta-ticket__sobrelinea">DETALLE DE LA COMPRA</p>
          <div className="tarjeta-ticket__ruta">
          <div><small>Origen</small><strong>{compra.origen}</strong></div>
          <span className="tarjeta-ticket__linea" aria-hidden="true">
  <img src="/bus-ruta.svg" alt="" className="tarjeta-ticket__bus" />
  <span>→</span>
</span>
          <div className="tarjeta-ticket__ciudad-derecha"><small>Destino</small><strong>{compra.destino}</strong></div>
        </div>
        <div className="tarjeta-ticket__viaje">
          <div><small>Salida</small><strong>{formatearFechaLarga(compra.fecha)} · {compra.hora}</strong></div>
          <div><small>Servicio</small><strong>{compra.empresa} · {compra.tipoBus}</strong></div>
        </div>
        <div className="tarjeta-ticket__boletos">
          <h3>Boletos de esta compra <span>{compra.boletos.length}</span></h3>
          {compra.boletos.map((boleto, indice) => (
            <div className="tarjeta-ticket__boleto" key={boleto.codigo}>
              <div><small>Boleto {indice + 1}</small><strong>Asiento {boleto.asiento}</strong></div>
              <div><small>Código</small><strong className="tarjeta-ticket__codigo">{boleto.codigo}</strong></div>
              <strong>{Number.isFinite(boleto.precio) ? formatearPrecio(boleto.precio) : '—'}</strong>
            </div>
          ))}
        </div>
        <div className="tarjeta-ticket__total"><span>Total de la compra</span><strong>{formatearPrecio(compra.total)}</strong></div>
        <div className="tarjeta-ticket__acciones">
          {demostracion && <button type="button" onClick={onDescargar} disabled={descargando}>
            {descargando ? 'Preparando PDF…' : 'Descargar PDF de prueba'}
          </button>}
          <p>{demostracion ? 'Documento de demostración. No es válido para viajar.' : 'La descarga estará disponible con la emisión de boletos.'}</p>
          {errorPdf && <p role="alert">{errorPdf}</p>}
        </div>
      </div>
    </article>
  )
}
