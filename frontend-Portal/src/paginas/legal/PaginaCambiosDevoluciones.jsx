import { Link } from 'react-router-dom'
import { CONTACTO } from '../../datos/contacto'
import { DatosEmpresa, DocumentoLegal } from '../../componentes/legal/DocumentoLegal'

export function PaginaCambiosDevoluciones() {
  const asunto = encodeURIComponent('Solicitud de cambio o devolución - código RL-')

  return (
    <DocumentoLegal
      titulo="Política de Cambios y Devoluciones"
      resumen="Cuándo puedes cambiar la fecha de tu pasaje, cuándo te devolvemos el dinero y cómo pedirlo."
    >
      <section>
        <h2>1. Alcance</h2>
        <p>
          Esta política aplica a los pasajes comprados en RutaLibre y forma parte de los{' '}
          <Link to="/terminos-y-condiciones">Términos y Condiciones</Link>. El pasaje es personal y corresponde a una
          fecha, hora, ruta y asiento determinados.
        </p>
      </section>

      <section>
        <h2>2. Cambio de fecha (postergación)</h2>
        <ul>
          <li>
            Puedes cambiar la fecha del pasaje hasta <strong>{CONTACTO.horasLimiteCambio} horas antes</strong> de la hora
            de salida, desde «Mis pasajes» en tu perfil, sujeto a disponibilidad de asientos en el nuevo viaje.
          </li>
          <li>Si el nuevo viaje cuesta más, pagas solo la diferencia. Si cuesta menos, no se devuelve la diferencia.</li>
          <li>Pasadas las {CONTACTO.horasLimiteCambio} horas previas a la salida, o si el pasajero no se presenta, el pasaje no puede cambiarse.</li>
          <li>
            En agencia puede pedir el cambio el pasajero titular, con su DNI original y su boleto (impreso o en el
            celular).
          </li>
          <li>
            También puede pedirlo un tercero, con su DNI original, copia del DNI del pasajero, el boleto y una carta
            poder simple firmada por el pasajero.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Cuándo corresponde la devolución del dinero</h2>
        <p>Devolvemos el 100% del importe pagado en cualquiera de estos casos:</p>
        <ul>
          <li>El viaje es cancelado por RutaLibre o por la empresa de transporte y el pasajero no desea reprogramarlo.</li>
          <li>El viaje es reprogramado de forma sustancial y el nuevo horario no le sirve al pasajero.</li>
          <li>El pago fue aprobado pero los asientos ya no estaban disponibles (el reembolso se hace de forma automática).</li>
          <li>Se realizó un cobro duplicado o por un importe distinto al mostrado en pantalla.</li>
          <li>El pasaje no pudo emitirse por una falla del sistema, aunque el cobro se haya realizado.</li>
        </ul>
        <p>
          La compra de un pasaje para una fecha y hora determinadas no admite desistimiento posterior sin cumplir las
          condiciones de esta política. La alternativa para quien no pueda viajar es el cambio de fecha del punto 2.
        </p>
      </section>

      <section>
        <h2>4. Cómo solicitar un cambio o una devolución</h2>
        <ol>
          <li>
            Los cambios de fecha se hacen directamente en «Mis pasajes». Las devoluciones se solicitan escribiendo a{' '}
            <a href={`mailto:${CONTACTO.correo}?subject=${asunto}`}>{CONTACTO.correo}</a>.
          </li>
          <li>
            Indica el código de compra (RL-XXXXXX), el nombre y documento del pasajero, el correo con el que compraste y el
            motivo de la solicitud. Si corresponde, adjunta la evidencia (por ejemplo, la captura del cobro duplicado).
          </li>
          <li>Responderemos en un plazo máximo de {CONTACTO.plazoRespuesta} indicando si la solicitud procede.</li>
        </ol>
      </section>

      <section>
        <h2>5. Plazo y medio del reembolso</h2>
        <p>
          El reembolso se realiza por el mismo medio con el que se pagó (la tarjeta o la cuenta Yape usada en la compra) y
          en la misma moneda, soles. Una vez aprobada la devolución, el dinero se acredita en un plazo de{' '}
          <strong>{CONTACTO.plazoReembolso}</strong>, que puede variar según el banco emisor de la tarjeta. No se descuentan
          comisiones del importe reembolsado en los casos del punto 3.
        </p>
      </section>

      <section>
        <h2>6. Reclamos</h2>
        <p>
          Si no estás de acuerdo con la respuesta, puedes registrar un reclamo en el{' '}
          <Link to="/libro-reclamaciones">Libro de Reclamaciones virtual</Link> o acudir al Indecopi.
        </p>
      </section>

      <section>
        <h2>7. Contacto</h2>
        <DatosEmpresa />
      </section>
    </DocumentoLegal>
  )
}