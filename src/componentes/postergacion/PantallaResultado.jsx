import { Link } from 'react-router-dom'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { BotonSecundario } from '../comunes/BotonSecundario'
import { EstadoDisponibilidad } from '../comunes/EstadoDisponibilidad'
import { formatearFechaCorta, formatearFechaLarga, formatearPrecio } from '../../utilidades/formato'
import { TarjetaPasajeOriginal } from './TarjetaPasajeOriginal'

function IconoExito() {
  return (
    <svg className="resultado-icono__svg" width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle className="resultado-icono__circulo" cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="3" />
      <path className="resultado-icono__marca" d="M19 33.5 28 42.5 45.5 23" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconoRechazo() {
  return (
    <svg className="resultado-icono__svg" width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle className="resultado-icono__circulo" cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="3" />
      <path d="M32 18v17" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="44.5" r="2.6" fill="currentColor" />
    </svg>
  )
}

function Exito({ resultado, pasajeOriginal, alIrAMisPasajes }) {
  const { pasaje, montoAdicional, pago } = resultado
  const moneda = pasaje.moneda

  return (
    <div className="resultado resultado--exito">
      <span className="resultado-icono resultado-icono--exito"><IconoExito /></span>
      <h2 className="resultado__titulo" tabIndex={-1} data-foco-paso>¡Postergación confirmada!</h2>
      <p className="resultado__texto">
        Tu pasaje <strong>{pasaje.numeroBoleto}</strong> ahora viaja en la nueva fecha. Es el mismo pasaje: conserva tu compra y tu pago original.
      </p>

      <article className="resultado-ticket" aria-label="Nuevo viaje del pasaje">
        <div className="resultado-ticket__franja">
          <span>Nuevo viaje</span>
          <EstadoDisponibilidad estado="confirmado" etiqueta="Postergado" />
        </div>
        <div className="resultado-ticket__ruta">
          <span>{pasaje.origen}</span>
          <span aria-hidden="true">→</span>
          <span>{pasaje.destino}</span>
        </div>
        <p className="resultado-ticket__fecha">{formatearFechaLarga(pasaje.fechaSalida)}</p>
        <dl className="resultado-ticket__datos">
          <div><dt>Código</dt><dd>{pasaje.numeroBoleto}</dd></div>
          <div><dt>Salida</dt><dd>{pasaje.horaSalida}</dd></div>
          <div><dt>Llegada</dt><dd>{pasaje.horaLlegada ?? '—'}</dd></div>
          <div><dt>Asiento</dt><dd>{pasaje.asiento}{pasaje.pisoAsiento > 1 ? ` · Piso ${pasaje.pisoAsiento}` : ''}</dd></div>
          <div><dt>Servicio</dt><dd>{pasaje.empresa} · {pasaje.tipoBus}</dd></div>
          <div>
            <dt>Importe adicional</dt>
            <dd>{montoAdicional > 0 ? formatearPrecio(montoAdicional, moneda) : 'Sin cobro adicional'}</dd>
          </div>
          {pago && <div><dt>Operación</dt><dd>{pago.referencia}</dd></div>}
        </dl>
        <p className="resultado-ticket__anterior">
          Viaje anterior: {pasajeOriginal.origen} → {pasajeOriginal.destino} · {formatearFechaCorta(pasajeOriginal.fechaSalida)} · {pasajeOriginal.horaSalida} · asiento {pasajeOriginal.asiento}
        </p>
      </article>

      <div className="resultado__acciones">
        <BotonPrincipal onClick={alIrAMisPasajes}>Volver a Mis pasajes</BotonPrincipal>
      </div>
    </div>
  )
}

function Rechazo({ resultado, pasajeOriginal, alIrAMisPasajes, alReelegirAsiento }) {
  return (
    <div className="resultado resultado--rechazo">
      <span className="resultado-icono resultado-icono--rechazo"><IconoRechazo /></span>
      <h2 className="resultado__titulo" tabIndex={-1} data-foco-paso>No se pudo postergar tu pasaje</h2>
      <p className="resultado__texto resultado__texto--motivo" role="alert">
        <strong>Motivo:</strong> {resultado.mensaje}
      </p>
      <p className="resultado__nota">
        <EstadoDisponibilidad estado="cancelado" etiqueta="Postergación rechazada" />
        <span>Tu pasaje no fue modificado: conserva su viaje y su asiento originales.</span>
      </p>

      <div className="resultado__original">
        <TarjetaPasajeOriginal pasaje={pasajeOriginal} titulo="Pasaje sin cambios" />
      </div>

      <div className="resultado__acciones">
        {resultado.puedeReelegirAsiento && (
          <BotonPrincipal onClick={alReelegirAsiento}>Elegir otro asiento</BotonPrincipal>
        )}
        {resultado.puedeReelegirAsiento ? (
          <BotonSecundario onClick={alIrAMisPasajes}>Volver a Mis pasajes</BotonSecundario>
        ) : (
          <BotonPrincipal onClick={alIrAMisPasajes}>Volver a Mis pasajes</BotonPrincipal>
        )}
      </div>
      <Link className="resultado__ayuda" to="/ayuda">¿Necesitas ayuda?</Link>
    </div>
  )
}

export function PantallaResultado({ resultado, pasajeOriginal, alIrAMisPasajes, alReelegirAsiento }) {
  return resultado.exito
    ? <Exito resultado={resultado} pasajeOriginal={pasajeOriginal} alIrAMisPasajes={alIrAMisPasajes} />
    : <Rechazo resultado={resultado} pasajeOriginal={pasajeOriginal} alIrAMisPasajes={alIrAMisPasajes} alReelegirAsiento={alReelegirAsiento} />
}
