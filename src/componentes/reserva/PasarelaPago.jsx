import { useEffect, useId, useState } from 'react'
import { CampoTexto } from '../comunes/CampoTexto'
import {
  CELULARES_PRUEBA_YAPE,
  TARJETAS_PRUEBA,
  TOPE_MAXIMO_YAPE,
  soloDigitos,
} from '../../utilidades/pagoMercadoPago'
import { MODO_SANDBOX, obtenerMercadoPago } from '../../servicios/mercadoPagoSdk'
import { formatearPrecio } from '../../utilidades/formato'
import './pasarelaPago.css'

/**
 * Pasarela de pago con Mercado Pago (Checkout API vía Orders).
 *
 * - Tarjeta: Card Payment Brick oficial. Los datos de la tarjeta se escriben en campos seguros de Mercado
 *   Pago; RutaLibre solo obtiene un token de un solo uso con `getFormData()` (ver PaginaReserva).
 * - Yape: celular + código de aprobación, que MercadoPago.js convierte en token.
 *
 * `refControladorTarjeta.current` recibe el controlador del Brick para que el botón "Pagar" del resumen
 * (el flujo existente de RutaLibre) dispare el pago; el Brick no muestra botón propio.
 */
export function PasarelaPago({
  metodo,
  alCambiarMetodo,
  valoresYape,
  errores,
  camposTocados,
  alCambiarCampo,
  alTocarCampo,
  total,
  correoInicial,
  tema,
  bloqueado,
  refControladorTarjeta,
}) {
  function errorDe(campo) {
    return camposTocados[campo] ? errores[campo] : undefined
  }

  return (
    <div className="pasarela-pago">
      <div className="pasarela-pago__metodos" role="tablist" aria-label="Método de pago">
        <button
          type="button"
          role="tab"
          aria-selected={metodo === 'tarjeta'}
          className={`pasarela-pago__metodo ${metodo === 'tarjeta' ? 'pasarela-pago__metodo--activo' : ''}`}
          onClick={() => alCambiarMetodo('tarjeta')}
          disabled={bloqueado}
        >
          <svg width="18" height="14" viewBox="0 0 20 16" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="18" height="14" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M1 5.5h18" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          Tarjeta
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={metodo === 'yape'}
          className={`pasarela-pago__metodo ${metodo === 'yape' ? 'pasarela-pago__metodo--activo' : ''}`}
          onClick={() => alCambiarMetodo('yape')}
          disabled={bloqueado}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="5" y="1.5" width="10" height="17" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8.5 15.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Yape
        </button>
      </div>

      {metodo === 'tarjeta' ? (
        <TarjetaMercadoPago
          total={total}
          correoInicial={correoInicial}
          tema={tema}
          bloqueado={bloqueado}
          refControlador={refControladorTarjeta}
        />
      ) : (
        <fieldset className="pasarela-pago__campos" disabled={bloqueado}>
          <FormularioYape
            valores={valoresYape}
            errorDe={errorDe}
            alCambiarCampo={alCambiarCampo}
            alTocarCampo={alTocarCampo}
            total={total}
          />
        </fieldset>
      )}

      {MODO_SANDBOX && (
        <details className="pasarela-pago__prueba">
          <summary>Datos de prueba (Sandbox de Mercado Pago)</summary>
          {metodo === 'tarjeta' ? (
            <>
              <ul>
                {TARJETAS_PRUEBA.map((tarjeta) => (
                  <li key={tarjeta.numero}>
                    <strong>{tarjeta.marca}</strong> {tarjeta.numero} · CVV {tarjeta.cvv} · 11/30
                  </li>
                ))}
              </ul>
              <p>
                El <strong>nombre del titular</strong> decide el resultado: <code>APRO</code> aprobado (documento{' '}
                <code>123456789</code>), <code>OTHE</code> rechazado, <code>CONT</code> pendiente, <code>FUND</code> fondos
                insuficientes, <code>SECU</code> código de seguridad inválido. Con 3DS: <code>APRO-CHOK</code> muestra el
                desafío del banco.
              </p>
            </>
          ) : (
            <>
              <ul>
                {CELULARES_PRUEBA_YAPE.map((prueba) => (
                  <li key={prueba.numero}>
                    <strong>{prueba.numero}</strong> · {prueba.resultado}
                  </li>
                ))}
              </ul>
              <p>Código de aprobación en todos los casos: <code>123456</code>.</p>
            </>
          )}
        </details>
      )}

      <p className="pasarela-pago__seguridad">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1 12 3v3.5C12 10 9.8 12 7 13 4.2 12 2 10 2 6.5V3l5-2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        Procesado con Mercado Pago. RutaLibre no ve ni guarda los datos de tu tarjeta.
        {MODO_SANDBOX && ' Entorno de pruebas: no se realizan cobros reales.'}
      </p>
    </div>
  )
}

/** Monta el Card Payment Brick. Se vuelve a montar solo si cambian el total, el correo o el tema. */
function TarjetaMercadoPago({ total, correoInicial, tema, bloqueado, refControlador }) {
  const idContenedor = `card-brick-${useId().replace(/:/g, '')}`
  const [estado, setEstado] = useState('cargando') // cargando | listo | error
  const [mensajeError, setMensajeError] = useState(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let cancelado = false
    let controlador = null
    setEstado('cargando')
    setMensajeError(null)

    async function montar() {
      try {
        const mp = await obtenerMercadoPago()
        if (cancelado) return
        controlador = await mp.bricks().create('cardPayment', idContenedor, {
          initialization: {
            amount: Number(total.toFixed(2)),
            ...(correoInicial ? { payer: { email: correoInicial } } : {}),
          },
          customization: {
            visual: {
              hidePaymentButton: true,
              hideFormTitle: true,
              style: {
                theme: tema === 'dark' ? 'dark' : 'default',
                customVariables: { baseColor: '#0F4C5C', borderRadiusMedium: '10px' },
              },
            },
            paymentMethods: { maxInstallments: 12 },
          },
          callbacks: {
            onReady: () => {
              if (!cancelado) setEstado('listo')
            },
            // El envío lo hace el botón "Pagar" de RutaLibre (getFormData); este callback no se usa.
            onSubmit: () => Promise.resolve(),
            onError: (error) => {
              // Errores de validación de campos se muestran dentro del Brick; solo se reportan los críticos.
              if (error?.type === 'critical' && !cancelado) {
                setEstado('error')
                setMensajeError('No se pudo cargar el formulario de tarjeta. Inténtalo de nuevo.')
              }
            },
          },
        })
        if (cancelado) {
          controlador?.unmount?.()
          return
        }
        if (refControlador) refControlador.current = controlador
      } catch (error) {
        if (!cancelado) {
          setEstado('error')
          setMensajeError(error.message || 'No se pudo cargar Mercado Pago.')
        }
      }
    }

    montar()
    return () => {
      cancelado = true
      if (refControlador && refControlador.current === controlador) refControlador.current = null
      try {
        controlador?.unmount?.()
      } catch {
        // el contenedor ya no existe
      }
    }
  }, [idContenedor, total, correoInicial, tema, intento, refControlador])

  return (
    <div className={`pasarela-pago__brick${bloqueado ? ' pasarela-pago__brick--bloqueado' : ''}`} aria-busy={estado === 'cargando'}>
      <p className="pasarela-pago__nota">
        Total a pagar: <strong>{formatearPrecio(total)}</strong>. Las cuotas disponibles las define el banco emisor.
      </p>
      {estado === 'cargando' && (
        <div className="pasarela-pago__brick-cargando" role="status">
          <span className="pasarela-pago__spinner" aria-hidden="true" />
          Cargando formulario seguro de Mercado Pago…
        </div>
      )}
      {estado === 'error' && (
        <div className="pasarela-pago__aviso" role="alert">
          {mensajeError}{' '}
          <button type="button" className="pasarela-pago__reintentar" onClick={() => setIntento((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      )}
      <div id={idContenedor} className="pasarela-pago__brick-contenedor" />
    </div>
  )
}

function FormularioYape({ valores, errorDe, alCambiarCampo, alTocarCampo, total }) {
  return (
    <div className="pasarela-pago__formulario">
      <ol className="pasarela-pago__pasos-yape">
        <li>Abre tu app de Yape.</li>
        <li>
          En el menú, entra a <strong>Código de aprobación</strong>.
        </li>
        <li>Ingresa aquí tu celular y el código de 6 dígitos antes de que expire.</li>
      </ol>

      {total > TOPE_MAXIMO_YAPE && (
        <p className="pasarela-pago__aviso" role="status">
          El total supera el tope máximo de Yape ({formatearPrecio(TOPE_MAXIMO_YAPE)}). Usa una tarjeta o reduce la cantidad
          de pasajes.
        </p>
      )}

      <div className="pasarela-pago__fila">
        <div onBlur={() => alTocarCampo('celular')}>
          <CampoTexto
            etiqueta="Celular afiliado a Yape"
            valor={valores.celular}
            alCambiar={(valor) => alCambiarCampo('celular', soloDigitos(valor).slice(0, 9))}
            marcador="987 654 321"
            requerido
            error={errorDe('celular')}
            autoComplete="tel-national"
            modoEntrada="numeric"
          />
        </div>
        <div onBlur={() => alTocarCampo('codigoAprobacion')}>
          <CampoTexto
            etiqueta="Código de aprobación"
            valor={valores.codigoAprobacion}
            alCambiar={(valor) => alCambiarCampo('codigoAprobacion', soloDigitos(valor).slice(0, 6))}
            marcador="000000"
            requerido
            error={errorDe('codigoAprobacion')}
            autoComplete="one-time-code"
            modoEntrada="numeric"
          />
        </div>
      </div>

      <div onBlur={() => alTocarCampo('correo')}>
        <CampoTexto
          etiqueta="Correo electrónico"
          tipo="email"
          valor={valores.correo}
          alCambiar={(valor) => alCambiarCampo('correo', valor)}
          marcador="tucorreo@ejemplo.com"
          requerido
          error={errorDe('correo')}
          autoComplete="email"
          ayuda="Aquí te enviaremos la confirmación de tu compra."
        />
      </div>
    </div>
  )
}
