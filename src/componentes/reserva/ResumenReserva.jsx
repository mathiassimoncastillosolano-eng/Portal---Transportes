import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { formatearFechaCorta, formatearPrecio } from '../../utilidades/formato'
import './resumenReserva.css'

/**
 * Panel lateral de resumen. Es el mismo componente durante los tres pasos
 * de la compra (asiento, pasajero, pago); lo que cambia es la lista de
 * `filasDetalle` que le pasa cada paso — así el resumen siempre refleja el
 * contexto vigente (asiento/ticket activo) sin duplicar su estructura.
 */
export function ResumenReserva({
  resultado,
  fecha,
  asientosSeleccionados = [],
  mostrarPiso,
  filasDetalle = [],
  precioTotal,
  textoBoton,
  onContinuar,
  deshabilitado,
  cargando,
  mensajeAyuda,
  mostrarBoton = true,
}) {
  const cantidad = asientosSeleccionados.length

  return (
    <aside className="resumen-reserva superficie-cristal">
      <h2 className="resumen-reserva__titulo">Resumen del viaje</h2>

      <div className="resumen-reserva__ruta">
        <span>{resultado.origen}</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{resultado.destino}</span>
      </div>

      <p className="resumen-reserva__fecha">
        {formatearFechaCorta(fecha)} · {resultado.horaSalida} → {resultado.horaLlegada}
      </p>

      {cantidad > 0 && (
        <div className="resumen-reserva__asientos">
          <span className="resumen-reserva__asientos-titulo">
            {cantidad} {cantidad === 1 ? 'asiento seleccionado' : 'asientos seleccionados'}
          </span>
          <div className="resumen-reserva__asientos-chips">
            {asientosSeleccionados.map((asiento) => (
              <span className="resumen-reserva__chip" key={asiento.clave ?? `${asiento.piso}-${asiento.numero}`}>
                {asiento.numero}
                {mostrarPiso ? ` · P${asiento.piso}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {filasDetalle.length > 0 && (
        <dl className="resumen-reserva__lista">
          {filasDetalle.map((fila) => (
            <div key={fila.etiqueta}>
              <dt>{fila.etiqueta}</dt>
              <dd>{fila.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {typeof precioTotal === 'number' && (
        <div className="resumen-reserva__total">
          <span>Total</span>
          <span className="resumen-reserva__total-monto">{formatearPrecio(precioTotal)}</span>
        </div>
      )}

      {mostrarBoton && (
        <BotonPrincipal onClick={onContinuar} deshabilitado={deshabilitado || cargando} ancho="100%">
          {cargando ? 'Procesando…' : textoBoton}
        </BotonPrincipal>
      )}

      {mensajeAyuda && (mostrarBoton ? deshabilitado && !cargando : true) && (
        <p className="resumen-reserva__ayuda" role="status">{mensajeAyuda}</p>
      )}
    </aside>
  )
}
