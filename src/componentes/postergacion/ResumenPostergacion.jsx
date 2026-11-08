import { formatearFechaCorta, formatearPrecio } from '../../utilidades/formato'

export function ResumenPostergacion({ pasaje, viaje, asiento, comparacion }) {
  return (
    <section className="postergacion-resumen" aria-label="Resumen de tu nuevo viaje">
      <h2 className="postergacion-resumen__titulo">Tu nuevo viaje</h2>
      {viaje ? (
        <>
          <p className="postergacion-resumen__ruta">
            {viaje.origen} <span aria-hidden="true">→</span> {viaje.destino}
          </p>
          <dl className="postergacion-resumen__lista">
            <div><dt>Fecha</dt><dd>{formatearFechaCorta(viaje.fechaSalida)}</dd></div>
            <div><dt>Salida</dt><dd>{viaje.horaSalida}</dd></div>
            <div><dt>Servicio</dt><dd>{viaje.empresa} · {viaje.tipoBus}</dd></div>
            <div>
              <dt>Asiento</dt>
              <dd>{asiento ? `${asiento.numero}${asiento.piso > 1 ? ` · Piso ${asiento.piso}` : ''}` : 'Sin elegir'}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="postergacion-resumen__vacio">Aún no elegiste un viaje.</p>
      )}
      {comparacion && (
        <dl className="postergacion-resumen__lista postergacion-resumen__lista--total">
          <div><dt>Pagaste</dt><dd>{formatearPrecio(comparacion.original, pasaje.moneda)}</dd></div>
          <div><dt>Nueva tarifa</dt><dd>{formatearPrecio(comparacion.nueva, pasaje.moneda)}</dd></div>
          <div className="postergacion-resumen__pagar">
            <dt>A pagar ahora</dt>
            <dd>{formatearPrecio(comparacion.montoAPagar, pasaje.moneda)}</dd>
          </div>
        </dl>
      )}
      <p className="postergacion-resumen__nota">
        Conservas el mismo pasaje, la misma compra y tu pago original.
      </p>
    </section>
  )
}
