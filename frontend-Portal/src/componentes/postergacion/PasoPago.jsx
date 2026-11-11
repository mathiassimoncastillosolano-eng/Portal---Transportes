import { formatearPrecio } from '../../utilidades/formato'
import '../reserva/pasarelaPago.css'

const METODOS = [
  {
    clave: 'tarjeta',
    etiqueta: 'Tarjeta',
    detalle: 'Se simulará un cobro con tarjeta de crédito o débito.',
    icono: (
      <svg width="18" height="14" viewBox="0 0 20 16" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="18" height="14" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 5.5h18" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    clave: 'yape',
    etiqueta: 'Yape',
    detalle: 'Se simulará un pago aprobado desde tu app de Yape.',
    icono: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="5" y="1.5" width="10" height="17" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8.5 15.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
]

const ETIQUETAS_RESULTADO = {
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  PENDIENTE: 'Pendiente',
  ERROR_PROCESAMIENTO: 'Error de procesamiento',
  ASIENTO_NO_DISPONIBLE: 'Asiento no disponible',
}

function formatearHora(ms) {
  return new Date(ms).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function PasoPago({ pasaje, comparacion, metodo, alCambiarMetodo, procesando, avisoPago, intentos }) {
  const activo = METODOS.find((m) => m.clave === metodo) ?? METODOS[0]

  return (
    <div className="postergacion-paso">
      <div className="postergacion-paso__cabecera">
        <h2 className="postergacion-paso__titulo" tabIndex={-1} data-foco-paso>Paga la diferencia</h2>
        <p className="postergacion-paso__texto">
          Solo pagas {formatearPrecio(comparacion.montoAPagar, pasaje.moneda)}. Tu pasaje no cambia hasta que el pago sea aprobado.
        </p>
      </div>

      <div className="postergacion-pago">
        <p className="postergacion-aviso postergacion-aviso--info">
          Pago simulado: no se realiza ningún cobro real.
        </p>

        <div className="pasarela-pago__metodos postergacion-pago__metodos" role="radiogroup" aria-label="Método de pago">
          {METODOS.map((opcion) => {
            const seleccionado = opcion.clave === metodo
            return (
              <button
                key={opcion.clave}
                type="button"
                role="radio"
                aria-checked={seleccionado}
                className={`pasarela-pago__metodo ${seleccionado ? 'pasarela-pago__metodo--activo' : ''}`}
                onClick={() => alCambiarMetodo(opcion.clave)}
                disabled={procesando}
              >
                {opcion.icono}
                {opcion.etiqueta}
                {seleccionado && <span className="postergacion-pago__marca" aria-hidden="true">✓</span>}
              </button>
            )
          })}
        </div>

        <div className="postergacion-pago__panel">
          <p>{activo.detalle}</p>
          <div className="postergacion-pago__total">
            <span>Total a pagar</span>
            <strong>{formatearPrecio(comparacion.montoAPagar, pasaje.moneda)}</strong>
          </div>
        </div>

        {avisoPago && (
          <p
            className={`postergacion-aviso postergacion-aviso--${avisoPago.tipo === 'pendiente' ? 'aviso' : 'error'}`}
            role="alert"
          >
            <strong>
              {avisoPago.tipo === 'pendiente' ? 'Pago pendiente. ' : avisoPago.tipo === 'rechazado' ? 'Pago rechazado. ' : 'No se pudo procesar. '}
            </strong>
            {avisoPago.mensaje} Tu viaje y tu asiento originales se conservan; puedes reintentar.
          </p>
        )}

        {intentos.length > 0 && (
          <div className="postergacion-pago__intentos">
            <h3>Intentos de pago</h3>
            <ol>
              {intentos.map((intento) => (
                <li key={intento.numero}>
                  <span>Intento {intento.numero} · {intento.metodo === 'yape' ? 'Yape' : 'Tarjeta'} · {formatearHora(intento.hora)}</span>
                  <strong className={`postergacion-pago__resultado postergacion-pago__resultado--${intento.resultado === 'APROBADO' ? 'ok' : 'fallo'}`}>
                    {ETIQUETAS_RESULTADO[intento.resultado] ?? 'Fallido'}
                  </strong>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
