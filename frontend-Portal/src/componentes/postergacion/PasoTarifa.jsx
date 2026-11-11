import { useId } from 'react'
import { ESCENARIO_TARIFA } from '../../utilidades/postergacion'
import { formatearPrecio } from '../../utilidades/formato'

const MENSAJES = {
  [ESCENARIO_TARIFA.IGUAL]: {
    titulo: 'Sin diferencia por pagar',
    texto: 'Ambas tarifas son iguales: esta postergación no genera ningún cobro adicional.',
    icono: 'igual',
  },
  [ESCENARIO_TARIFA.SUPERIOR]: {
    titulo: 'Debes pagar la diferencia',
    texto: 'La nueva tarifa es mayor a la que pagaste. En el siguiente paso pagas solo la diferencia con Yape o tarjeta.',
    icono: 'superior',
  },
  [ESCENARIO_TARIFA.INFERIOR]: {
    titulo: 'La nueva tarifa es menor',
    texto: 'No se devuelve el importe sobrante ni se genera saldo a favor. Para continuar debes aceptar esta condición.',
    icono: 'inferior',
  },
}

function Icono({ tipo }) {
  const trazos = {
    igual: <path d="M4 8h12M4 12h12" />,
    superior: <path d="M10 16V4m0 0L5 9m5-5 5 5" />,
    inferior: <path d="M10 4v12m0 0 5-5m-5 5-5-5" />,
  }
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {trazos[tipo]}
    </svg>
  )
}

export function PasoTarifa({ pasaje, viaje, comparacion, aceptaCondiciones, alAceptar, avisoPago }) {
  const idAceptacion = useId()
  const mensaje = MENSAJES[comparacion.escenario]
  const moneda = pasaje.moneda
  const inferior = comparacion.requiereAceptacion

  return (
    <div className="postergacion-paso">
      <div className="postergacion-paso__cabecera">
        <h2 className="postergacion-paso__titulo" tabIndex={-1} data-foco-paso>Diferencia tarifaria</h2>
        <p className="postergacion-paso__texto">Comparamos lo que pagaste con la tarifa del nuevo viaje.</p>
      </div>

      {avisoPago && (
        <p className="postergacion-aviso postergacion-aviso--error" role="alert">{avisoPago.mensaje}</p>
      )}

      <div className="tarifa-comparacion">
        <div className="tarifa-comparacion__columna">
          <span className="tarifa-comparacion__etiqueta">Pagaste</span>
          <strong className="tarifa-comparacion__monto">{formatearPrecio(comparacion.original, moneda)}</strong>
          <span className="tarifa-comparacion__detalle">{pasaje.origen} → {pasaje.destino}</span>
        </div>
        <span className="tarifa-comparacion__separador" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10h13m0 0-4-4m4 4-4 4" />
          </svg>
        </span>
        <div className="tarifa-comparacion__columna">
          <span className="tarifa-comparacion__etiqueta">Nueva tarifa</span>
          <strong className="tarifa-comparacion__monto">{formatearPrecio(comparacion.nueva, moneda)}</strong>
          <span className="tarifa-comparacion__detalle">{viaje.origen} → {viaje.destino}</span>
        </div>
      </div>

      <div className={`tarifa-resultado tarifa-resultado--${comparacion.escenario.toLowerCase()}`} role="status">
        <span className="tarifa-resultado__icono"><Icono tipo={mensaje.icono} /></span>
        <div className="tarifa-resultado__cuerpo">
          <h3 className="tarifa-resultado__titulo">{mensaje.titulo}</h3>
          <p className="tarifa-resultado__texto">{mensaje.texto}</p>
        </div>
        <div className="tarifa-resultado__importe">
          <span>{comparacion.requierePago ? 'A pagar' : inferior ? 'Diferencia' : 'Por pagar'}</span>
          <strong>
            {formatearPrecio(comparacion.requierePago ? comparacion.montoAPagar : inferior ? comparacion.diferencia : 0, moneda)}
          </strong>
        </div>
      </div>

      {inferior && (
        <label className={`tarifa-aceptacion${aceptaCondiciones ? ' tarifa-aceptacion--marcada' : ''}`} htmlFor={idAceptacion}>
          <input
            id={idAceptacion}
            type="checkbox"
            checked={aceptaCondiciones}
            onChange={(evento) => alAceptar(evento.target.checked)}
          />
          <span>
            Entiendo y acepto que <strong>no se me devolverá</strong> la diferencia de{' '}
            <strong>{formatearPrecio(comparacion.montoNoDevuelto, moneda)}</strong> y que{' '}
            <strong>tampoco se generará saldo a favor</strong>.
          </span>
        </label>
      )}

      <ul className="tarifa-consecuencias">
        <li>Tu pasaje mantiene su código, su compra y tu pago original.</li>
        <li>Cambian únicamente el viaje y el asiento.</li>
        <li>
          {comparacion.requierePago
            ? `Se cobrarán ${formatearPrecio(comparacion.montoAPagar, moneda)} en el siguiente paso.`
            : 'No se realiza ningún cobro adicional.'}
        </li>
      </ul>
    </div>
  )
}
