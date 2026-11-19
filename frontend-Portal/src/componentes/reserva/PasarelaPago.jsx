import { Link } from 'react-router-dom'
import { DATOS_PRUEBA, TARJETAS_PRUEBA, YAPE_PRUEBA } from '../../utilidades/pagoCulqi'
import { formatearPrecio } from '../../utilidades/formato'
import './pasarelaPago.css'

export function PasarelaPago({ total, esPrueba, aceptaTerminos, alCambiarTerminos, bloqueado }) {
  return (
    <div className="pasarela-pago">
      <div className="pasarela-pago__resumen">
        <svg width="22" height="18" viewBox="0 0 20 16" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="18" height="14" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
          <path d="M1 5.5h18" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <div>
          <p className="pasarela-pago__resumen-titulo">Paga con tarjeta o Yape</p>
          <p className="pasarela-pago__nota">
            Total a pagar: <strong>{formatearPrecio(total)}</strong>. Al pulsar el botón de pago se abrirá el formulario
            seguro de Culqi.
          </p>
        </div>
      </div>

      <div className="pasarela-pago__terminos">
        <input
          id="acepto-terminos"
          type="checkbox"
          checked={aceptaTerminos}
          onChange={(evento) => alCambiarTerminos(evento.target.checked)}
          disabled={bloqueado}
        />
        <label htmlFor="acepto-terminos">
          He leído y acepto los{' '}
          <Link to="/terminos-y-condiciones" target="_blank" rel="noopener noreferrer">
            Términos y Condiciones
          </Link>{' '}
          y la{' '}
          <Link to="/politica-cambios-devoluciones" target="_blank" rel="noopener noreferrer">
            Política de Cambios y Devoluciones
          </Link>
          .
        </label>
      </div>
      {esPrueba && (
        <details className="pasarela-pago__prueba" open>
          <summary>Datos de prueba (entorno Sandbox de Culqi)</summary>
          <ul>
            {TARJETAS_PRUEBA.map((tarjeta) => (
              <li key={tarjeta.numero}>
                <strong>{tarjeta.marca}</strong> {tarjeta.numero} · CVV {DATOS_PRUEBA.cvv} · vence {DATOS_PRUEBA.vencimiento}
              </li>
            ))}
          </ul>
          <p>
            Correo: <strong>{DATOS_PRUEBA.correo}</strong>. Yape: celular <strong>{YAPE_PRUEBA.celular}</strong> y{' '}
            {YAPE_PRUEBA.codigo}. No se realiza ningún cobro real.
          </p>
        </details>
      )}

      <p className="pasarela-pago__seguridad">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1 12 3v3.5C12 10 9.8 12 7 13 4.2 12 2 10 2 6.5V3l5-2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        Pago procesado por Culqi. RutaLibre no ve ni guarda los datos de tu tarjeta.
        {esPrueba && ' Entorno de pruebas: no se realizan cobros reales.'}
      </p>
    </div>
  )
}
