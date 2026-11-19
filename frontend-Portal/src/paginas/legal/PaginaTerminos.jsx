import { Link } from 'react-router-dom'
import { CONTACTO } from '../../datos/contacto'
import { DatosEmpresa, DocumentoLegal } from '../../componentes/legal/DocumentoLegal'

export function PaginaTerminos() {
  return (
    <DocumentoLegal
      titulo="Términos y Condiciones"
      resumen="Reglas que rigen la compra de pasajes de bus en RutaLibre. Léelas antes de pagar."
    >
      <section>
        <h2>1. Quiénes somos</h2>
        <p>
          RutaLibre es el nombre comercial con el que {CONTACTO.razonSocial} ofrece, a través de este sitio web, la venta
          de pasajes de transporte terrestre de pasajeros. Al comprar en RutaLibre, el usuario celebra el contrato con
          el titular que se identifica a continuación.
        </p>
        <DatosEmpresa />
      </section>

      <section>
        <h2>2. Aceptación</h2>
        <p>
          Estos Términos y Condiciones y la <Link to="/politica-cambios-devoluciones">Política de Cambios y Devoluciones</Link>{' '}
          se aceptan de forma expresa marcando la casilla correspondiente antes de realizar el pago. Sin esa aceptación no
          es posible completar una compra. El sitio no está dirigido a menores de edad para contratar por sí mismos.
        </p>
      </section>

      <section>
        <h2>3. Servicio ofrecido</h2>
        <p>
          RutaLibre permite buscar viajes, elegir asientos, registrar los datos de cada pasajero, pagar en línea y
          consultar los pasajes emitidos desde la cuenta del usuario. El servicio de transporte se presta en la fecha,
          hora, ruta y asiento indicados en el pasaje.
        </p>
      </section>

      <section>
        <h2>4. Registro y datos del pasajero</h2>
        <ul>
          <li>Para comprar es necesario iniciar sesión con una cuenta de usuario.</li>
          <li>Cada asiento se emite a nombre de un pasajero con su documento de identidad. El pasaje es personal.</li>
          <li>El usuario responde por la veracidad de los datos ingresados; un dato erróneo puede impedir el abordaje.</li>
          <li>Los asientos se reservan por tiempo limitado mientras se completa el pago. Si el tiempo vence, la reserva se libera.</li>
        </ul>
      </section>

      <section>
        <h2>5. Precios y moneda</h2>
        <p>
          Todos los precios se expresan en soles (PEN) e incluyen los impuestos que correspondan. El importe total se
          muestra antes de pagar y lo calcula el sistema según los asientos elegidos; no puede ser modificado por el
          usuario. No se cobran comisiones adicionales por el uso de la plataforma.
        </p>
      </section>

      <section>
        <h2>6. Medios de pago</h2>
        <p>
          Los pagos se realizan en línea con tarjetas de crédito o débito y con Yape, mediante la pasarela de pagos
          Culqi. Los datos de la tarjeta se ingresan en el formulario seguro de Culqi: RutaLibre no recibe ni almacena el
          número de la tarjeta ni su código de seguridad. Algunas tarjetas pueden requerir una verificación adicional de
          su banco (3D Secure). El pago se considera aprobado solo cuando Culqi lo confirma y el sistema registra la compra.
        </p>
        <p>
          Si el pago es rechazado no se emite ningún pasaje ni se retiene el importe. Si el pago fue aprobado pero los
          asientos dejaron de estar disponibles, el importe se reembolsa automáticamente.
        </p>
      </section>

      <section>
        <h2>7. Comprobante y entrega del pasaje</h2>
        <p>
          Una vez aprobado el pago, los pasajes quedan disponibles de inmediato en la sección «Mis pasajes» del perfil del
          usuario, con su código. El día del viaje basta con presentar el código del pasaje y el documento de identidad
          del pasajero. Los comprobantes de pago se emiten conforme a la normativa tributaria vigente.
        </p>
      </section>

      <section>
        <h2>8. Cambios, devoluciones y cancelaciones</h2>
        <p>
          Las condiciones para cambiar la fecha de un pasaje, solicitar una devolución y los plazos de reembolso están en
          la <Link to="/politica-cambios-devoluciones">Política de Cambios y Devoluciones</Link>, que forma parte de estos
          Términos y Condiciones.
        </p>
      </section>

      <section>
        <h2>9. Responsabilidades del usuario y del prestador</h2>
        <ul>
          <li>El usuario debe presentarse con anticipación al punto de embarque y portar el documento de identidad registrado.</li>
          <li>
            RutaLibre informará por correo electrónico y en el perfil del usuario cualquier cambio de horario o
            cancelación del viaje que conozca. En ese caso se aplican las opciones de la Política de Cambios y Devoluciones.
          </li>
          <li>
            La responsabilidad por el servicio de transporte durante el viaje, incluido el equipaje, se rige por las normas
            peruanas de transporte terrestre y de protección al consumidor.
          </li>
        </ul>
      </section>

      <section>
        <h2>10. Uso adecuado del sitio</h2>
        <p>
          Está prohibido usar el sitio para fines ilícitos, intentar vulnerar su seguridad, realizar compras con medios
          de pago que no pertenezcan al usuario o reservar asientos sin intención de pagarlos. RutaLibre puede anular las
          operaciones que incumplan esta regla y, cuando corresponda, reembolsar el importe.
        </p>
      </section>

      <section>
        <h2>11. Protección de datos personales</h2>
        <p>
          Los datos personales se tratan conforme a la Ley N.º 29733, Ley de Protección de Datos Personales, y su
          reglamento. Se usan únicamente para emitir los pasajes, gestionar el pago, atender solicitudes y cumplir
          obligaciones legales, y no se venden ni se ceden a terceros ajenos a la operación, salvo a Culqi para procesar
          el pago y a las autoridades cuando la ley lo exija. El titular puede ejercer sus derechos de acceso,
          rectificación, cancelación y oposición escribiendo a{' '}
          <a href={`mailto:${CONTACTO.correo}`}>{CONTACTO.correo}</a>.
        </p>
      </section>

      <section>
        <h2>12. Libro de Reclamaciones y atención de consultas</h2>
        <p>
          El usuario puede registrar quejas y reclamos en el <Link to="/libro-reclamaciones">Libro de Reclamaciones
          virtual</Link> o escribir a <a href={`mailto:${CONTACTO.correo}`}>{CONTACTO.correo}</a>. Respondemos en un plazo
          máximo de {CONTACTO.plazoRespuesta}. Si no está conforme con la respuesta, puede acudir al Indecopi.
        </p>
      </section>

      <section>
        <h2>13. Modificaciones</h2>
        <p>
          RutaLibre puede actualizar estos Términos y Condiciones. La versión vigente es la publicada en este sitio en el
          momento de la compra, y es la que el usuario acepta al pagar.
        </p>
      </section>

      <section>
        <h2>14. Ley aplicable y jurisdicción</h2>
        <p>
          Estos términos se rigen por las leyes de la República del Perú, en particular el Código de Protección y Defensa
          del Consumidor. Cualquier controversia se someterá a los jueces y tribunales competentes del Perú, sin perjuicio
          de los derechos del consumidor ante el Indecopi.
        </p>
      </section>
    </DocumentoLegal>
  )
}
