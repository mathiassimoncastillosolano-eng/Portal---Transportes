import { useEffect, useRef } from 'react'
import { formatearFechaLarga, formatearPrecio } from '../../utilidades/formato'
import './procesoPago.css'

/**
 * Capa de espera mientras el backend crea la order y verifica el pago. Bloquea la interacción con la
 * página (evita pagos repetidos) y avisa que no se cierre ni se recargue.
 */
export function PagoProcesando({ titulo = 'Estamos procesando tu pago', detalle }) {
  const refDialogo = useRef(null)
  useEffect(() => {
    refDialogo.current?.focus()
  }, [])

  return (
    <div className="proceso-pago__capa" role="presentation">
      <div
        ref={refDialogo}
        className="proceso-pago__dialogo"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="proceso-pago-titulo"
        aria-describedby="proceso-pago-detalle"
        aria-busy="true"
        tabIndex={-1}
      >
        <div className="proceso-pago__anillo" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="13" rx="3" stroke="currentColor" strokeWidth="1.6" />
            <path d="M4 11h16M8 20v-3M16 20v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <h2 id="proceso-pago-titulo" className="proceso-pago__titulo">{titulo}</h2>
        <p id="proceso-pago-detalle" className="proceso-pago__texto">
          {detalle ?? 'Estamos confirmando la operación con Mercado Pago.'}
        </p>
        <p className="proceso-pago__advertencia">
          No cierres ni recargues esta página y no vuelvas a pagar mientras se procesa. Puede tardar unos segundos.
        </p>
      </div>
    </div>
  )
}

/**
 * Desafío 3DS del banco en un iframe (documentación de Orders: transaction_security.url). Al terminar,
 * el banco envía {status: 'COMPLETE'} por postMessage; eso NO significa aprobado: se vuelve a consultar
 * el estado en el backend.
 */
export function Desafio3ds({ url, alTerminar }) {
  useEffect(() => {
    function alMensaje(evento) {
      if (evento?.data?.status === 'COMPLETE') alTerminar()
    }
    window.addEventListener('message', alMensaje)
    return () => window.removeEventListener('message', alMensaje)
  }, [alTerminar])

  return (
    <div className="proceso-pago__capa" role="presentation">
      <div className="proceso-pago__dialogo proceso-pago__dialogo--3ds" role="dialog" aria-modal="true" aria-labelledby="desafio-titulo">
        <h2 id="desafio-titulo" className="proceso-pago__titulo">Verificación de tu banco</h2>
        <p className="proceso-pago__texto">Completa la verificación para continuar. No cierres esta ventana.</p>
        <iframe className="proceso-pago__iframe" src={url} title="Verificación 3D Secure del banco" />
      </div>
    </div>
  )
}

/** Resultado no aprobado o desconocido. `fase`: rechazado | pendiente | reembolso. */
export function AvisoResultadoPago({ fase, titulo, texto, alConsultar, consultando }) {
  return (
    <div className={`proceso-pago__aviso proceso-pago__aviso--${fase}`} role={fase === 'rechazado' ? 'alert' : 'status'}>
      <svg width="20" height="20" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="8.2" stroke="currentColor" strokeWidth="1.5" />
        {fase === 'rechazado' ? (
          <path d="M6.2 6.2l5.6 5.6M11.8 6.2l-5.6 5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        ) : (
          <path d="M9 4.8v4.6l2.8 1.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      <div>
        <strong>{titulo}</strong>
        {texto && <p>{texto}</p>}
        {fase === 'rechazado' && <p className="proceso-pago__aviso-nota">No se registró ninguna compra. Puedes intentarlo de nuevo.</p>}
        {fase === 'pendiente' && alConsultar && (
          <button type="button" className="proceso-pago__enlace" onClick={alConsultar} disabled={consultando}>
            {consultando ? 'Consultando…' : 'Consultar el estado ahora'}
          </button>
        )}
      </div>
    </div>
  )
}

/** Confirmación: solo se muestra con estado APROBADO devuelto por el backend (compra ya registrada). */
export function CompraConfirmada({ respuesta, resultado, fecha, alVerPasajes, alIrInicio }) {
  const compra = respuesta.compra
  return (
    <section className="proceso-pago__confirmacion" aria-labelledby="compra-confirmada-titulo">
      <div className="proceso-pago__confirmacion-cabecera">
        <span className="proceso-pago__check" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 18 18" fill="none">
            <path d="M4.5 9.4 7.5 12.3 13.6 5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <h2 id="compra-confirmada-titulo">¡Pago aprobado!</h2>
          <p>Tu compra quedó registrada. Te esperamos a bordo.</p>
        </div>
      </div>

      <dl className="proceso-pago__datos">
        <div>
          <dt>N.º de operación</dt>
          <dd>{compra?.idPagoProveedor ?? respuesta.ordenId}</dd>
        </div>
        <div>
          <dt>Código de compra</dt>
          <dd>RL-{String(compra?.idVenta ?? '').padStart(6, '0')}</dd>
        </div>
        <div>
          <dt>Viaje</dt>
          <dd>
            {resultado.origen} → {resultado.destino}
          </dd>
        </div>
        <div>
          <dt>Salida</dt>
          <dd>
            {formatearFechaLarga(fecha)} · {resultado.horaSalida}
          </dd>
        </div>
      </dl>

      <table className="proceso-pago__pasajes">
        <caption>Pasajes emitidos</caption>
        <thead>
          <tr>
            <th scope="col">Asiento</th>
            <th scope="col">Pasajero</th>
            <th scope="col">Documento</th>
            <th scope="col" className="proceso-pago__num">Precio</th>
          </tr>
        </thead>
        <tbody>
          {(compra?.pasajes ?? []).map((pasaje) => (
            <tr key={pasaje.idPasaje}>
              <td>
                {pasaje.asiento}
                {pasaje.piso > 1 ? ` · piso ${pasaje.piso}` : ''}
              </td>
              <td>{pasaje.pasajero}</td>
              <td>{pasaje.documento}</td>
              <td className="proceso-pago__num">{formatearPrecio(pasaje.precio)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3}>
              Total pagado
            </th>
            <td className="proceso-pago__num">{formatearPrecio(compra?.montoTotal ?? respuesta.montoTotal)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="proceso-pago__acciones">
        <button type="button" className="proceso-pago__boton proceso-pago__boton--principal" onClick={alVerPasajes}>
          Ver mis pasajes
        </button>
        <button type="button" className="proceso-pago__boton" onClick={alIrInicio}>
          Volver al inicio
        </button>
      </div>
    </section>
  )
}
