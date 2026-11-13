import { EstadoDisponibilidad } from '../comunes/EstadoDisponibilidad'
import { formatearFechaHoraCompra, formatearFechaLarga, formatearPrecio } from '../../utilidades/formato'
import { avisoTotal, datosFaltantes, estadoVisible } from '../../utilidades/pasajesVista'
import './tarjetaTicket.css'

function motivoSinDocumento(compra) {
  if (compra.estado === 'REEMBOLSADA') return 'Esta compra fue reembolsada: no hay documento para descargar.'
  if (compra.estado !== 'CONFIRMADA') return 'El documento estará disponible cuando se confirme el pago de la compra.'
  if (compra.fase === 'NO_REALIZADO') return 'El viaje no se realizó: no hay documento para descargar.'
  return 'El documento no está disponible para esta compra.'
}

/** Detalle de una compra real: trayecto, datos del viaje, un elemento por boleto y total. */
export function TarjetaTicket({ compra, onDescargar, descargando, errorPdf, accionBoleto }) {
  const estado = estadoVisible(compra)
  const faltantes = compra.incompleta ? datosFaltantes(compra) : []
  const aviso = avisoTotal(compra)
  const salida = compra.fechaSalida && compra.horaSalida
    ? `${formatearFechaLarga(compra.fechaSalida)} · ${compra.horaSalida}`
    : 'Por confirmar'
  const servicio = compra.tipoBus ? `${compra.empresa} · ${compra.tipoBus}` : 'Por confirmar'
  const hayCambios = compra.boletos.some((boleto) => boleto.cambio)

  return (
    <article className="tarjeta-ticket">
      <div className="tarjeta-ticket__franja">
        <span className="tarjeta-ticket__marca"><span className="tarjeta-ticket__isotipo">RL</span> RutaLibre</span>
        <EstadoDisponibilidad estado={estado.clave} etiqueta={estado.etiqueta} />
      </div>
      <div className="tarjeta-ticket__cuerpo">
        <header className="tarjeta-ticket__encabezado">
          <h2 className="tarjeta-ticket__sobrelinea">DETALLE DE LA COMPRA</h2>
          <p className="tarjeta-ticket__codigo-compra">
            {compra.codigoCompra}{compra.comprobante ? ` · Comprobante ${compra.comprobante}` : ''}
          </p>
        </header>

        {hayCambios && <p className="tarjeta-ticket__origen-compra">VIAJE DE LA COMPRA ORIGINAL</p>}
        <div className="tarjeta-ticket__ruta">
          <div><small>Origen</small><strong>{compra.origen ?? '—'}</strong></div>
          <span className="tarjeta-ticket__linea" aria-hidden="true">
            <img src="/bus-ruta.svg" alt="" className="tarjeta-ticket__bus" />
            <span>→</span>
          </span>
          <div className="tarjeta-ticket__ciudad-derecha"><small>Destino</small><strong>{compra.destino ?? '—'}</strong></div>
        </div>

        <dl className="tarjeta-ticket__viaje">
          <div><dt>{hayCambios ? 'Salida original' : 'Salida'}</dt><dd>{salida}</dd></div>
          <div><dt>{hayCambios ? 'Servicio original' : 'Servicio'}</dt><dd>{servicio}</dd></div>
          <div><dt>Fecha de compra</dt><dd>{formatearFechaHoraCompra(compra.fechaCompra)}</dd></div>
        </dl>

        {faltantes.length > 0 && (
          <p className="tarjeta-ticket__alerta" role="note">
            Esta compra tiene información incompleta: falta {faltantes.join(', ')}.
          </p>
        )}

        <section className="tarjeta-ticket__boletos" aria-labelledby="titulo-boletos">
          <h3 id="titulo-boletos">Boletos de esta compra <span>{compra.boletos.length}</span></h3>
          {compra.boletos.length === 0 && (
            <p className="tarjeta-ticket__sin-boletos">No hay boletos registrados para esta compra.</p>
          )}
          {compra.boletos.map((boleto, indice) => (
            <div className={`tarjeta-ticket__boleto${boleto.cambio ? ' tarjeta-ticket__boleto--cambiado' : ''}`} key={boleto.idPasaje}>
              {boleto.viajeVigente && (
                <div className="tarjeta-ticket__boleto-estado">
                  <span>Boleto {indice + 1}</span>
                  <strong>{boleto.cambio ? 'Viaje cambiado' : 'Sin cambios'}</strong>
                </div>
              )}
              <div className="tarjeta-ticket__boleto-asiento">
                <small>{boleto.viajeVigente ? 'Asiento vigente' : `Boleto ${indice + 1}`}</small>
                <strong>Asiento {boleto.asiento ?? '—'}</strong>
              </div>
              <div className="tarjeta-ticket__boleto-pasajero">
                <small>Pasajero</small>
                <strong>{boleto.pasajero ?? '—'}</strong>
                {boleto.documento && <span className="tarjeta-ticket__documento">{boleto.documento}</span>}
              </div>
              <div className="tarjeta-ticket__boleto-codigo">
                <small>N.º de boleto</small>
                <strong className="tarjeta-ticket__codigo">{boleto.numeroBoleto}</strong>
              </div>
              <strong className="tarjeta-ticket__boleto-precio">{formatearPrecio(boleto.precio, compra.moneda)}</strong>
              {boleto.viajeVigente && (
                <div className="tarjeta-ticket__boleto-viaje">
                  <div><small>Viaje vigente</small><strong>{boleto.viajeVigente.origen} → {boleto.viajeVigente.destino}</strong></div>
                  <div><small>Salida</small><strong>{formatearFechaLarga(boleto.viajeVigente.fechaSalida)} · {boleto.viajeVigente.horaSalida}</strong></div>
                  <div><small>Servicio</small><strong>{boleto.viajeVigente.empresa} · {boleto.viajeVigente.tipoBus}</strong></div>
                </div>
              )}
              {boleto.cambio && (
                <p className="tarjeta-ticket__boleto-anterior">
                  Antes: {boleto.cambio.anterior.origen} → {boleto.cambio.anterior.destino} · {formatearFechaLarga(boleto.cambio.anterior.fechaSalida)} · {boleto.cambio.anterior.horaSalida} · asiento {boleto.cambio.anterior.asiento}.
                  {' '}Diferencia pagada: {formatearPrecio(boleto.cambio.adicionalPagado, compra.moneda)}.
                </p>
              )}
              {accionBoleto && <div className="tarjeta-ticket__boleto-accion">{accionBoleto(boleto, compra)}</div>}
            </div>
          ))}
        </section>

        <div className="tarjeta-ticket__total">
          <span>{hayCambios ? 'Compra original' : 'Total de la compra'}</span>
          <strong>{formatearPrecio(compra.total, compra.moneda)}</strong>
        </div>
        {hayCambios && (
          <div className="tarjeta-ticket__totales-cambio">
            <span>Pagos adicionales por cambios</span>
            <strong>{formatearPrecio(compra.totalPagado - compra.total, compra.moneda)}</strong>
            <span>Total pagado</span>
            <strong>{formatearPrecio(compra.totalPagado, compra.moneda)}</strong>
          </div>
        )}
        {aviso && <p className="tarjeta-ticket__alerta" role="note">{aviso}</p>}

        <div className="tarjeta-ticket__acciones">
          {compra.documentoDisponible ? (
            <>
              <button type="button" onClick={onDescargar} disabled={descargando}>
                {descargando ? 'Preparando PDF…' : compra.esMock ? 'Descargar PDF de prueba' : 'Descargar PDF'}
              </button>
              <p>{compra.esMock ? 'Documento de ejemplo sin validez para viajar.' : 'Documento con los datos de tu compra registrada.'}</p>
            </>
          ) : (
            <p>{motivoSinDocumento(compra)}</p>
          )}
          {errorPdf && <p role="alert" className="tarjeta-ticket__error">{errorPdf}</p>}
        </div>
      </div>
    </article>
  )
}
