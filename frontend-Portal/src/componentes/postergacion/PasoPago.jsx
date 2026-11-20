import { formatearPrecio } from '../../utilidades/formato'
import '../reserva/pasarelaPago.css'
import { CampoTexto } from '../comunes/CampoTexto'
import { PasarelaPago } from '../reserva/PasarelaPago'
import { CELULARES_PRUEBA_YAPE } from '../../utilidades/pagoSimulado'
import { DATOS_PRUEBA, TARJETAS_PRUEBA } from '../../utilidades/pagoCulqi'

const METODOS = [
  {
    clave: 'tarjeta',
    etiqueta: 'Tarjeta',
    detalle: 'Ingresa los datos de tu tarjeta de crédito o débito. El resultado del pago es simulado.',
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
    detalle: 'Ingresa los datos de tu cuenta Yape. El resultado del pago es simulado.',
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

function PagoSimulado({ pasaje, comparacion, metodo, alCambiarMetodo, procesando, datosPago, erroresPago, alEditarDato }) {
  const activo = METODOS.find((m) => m.clave === metodo) ?? METODOS[0]

  return (
    <>
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
        {metodo === 'tarjeta' ? (
          <div className="postergacion-pago__formulario">
            <CampoTexto etiqueta="Número de tarjeta" valor={datosPago.tarjeta.numero} alCambiar={(v) => alEditarDato('tarjeta', 'numero', v)} error={erroresPago.numero} modoEntrada="numeric" autoComplete="cc-number" marcador="4009 1753 3280 6176" deshabilitado={procesando} />
            <CampoTexto etiqueta="Titular" valor={datosPago.tarjeta.titular} alCambiar={(v) => alEditarDato('tarjeta', 'titular', v)} error={erroresPago.titular} autoComplete="cc-name" marcador="APRO" deshabilitado={procesando} />
            <CampoTexto etiqueta="Vencimiento (MM/AA)" valor={datosPago.tarjeta.vencimiento} alCambiar={(v) => alEditarDato('tarjeta', 'vencimiento', v)} error={erroresPago.vencimiento} modoEntrada="numeric" autoComplete="cc-exp" marcador="11/30" deshabilitado={procesando} />
            <CampoTexto etiqueta="CVV" valor={datosPago.tarjeta.cvv} alCambiar={(v) => alEditarDato('tarjeta', 'cvv', v)} error={erroresPago.cvv} modoEntrada="numeric" autoComplete="cc-csc" marcador="123" deshabilitado={procesando} />
            <p className="postergacion-pago__ayuda">Tarjetas de prueba: {TARJETAS_PRUEBA.map((t) => `${t.marca} ${t.numero}`).join(' · ')}. Vencimiento {DATOS_PRUEBA.vencimiento}, CVV {DATOS_PRUEBA.cvv}.</p>
          </div>
        ) : (
          <div className="postergacion-pago__formulario">
            <CampoTexto etiqueta="Celular Yape" valor={datosPago.yape.celular} alCambiar={(v) => alEditarDato('yape', 'celular', v)} error={erroresPago.celular} modoEntrada="numeric" marcador="111111111" deshabilitado={procesando} />
            <CampoTexto etiqueta="Código de aprobación" valor={datosPago.yape.codigoAprobacion} alCambiar={(v) => alEditarDato('yape', 'codigoAprobacion', v)} error={erroresPago.codigoAprobacion} modoEntrada="numeric" marcador="123456" deshabilitado={procesando} />
            <CampoTexto etiqueta="Correo" tipo="email" valor={datosPago.yape.correo} alCambiar={(v) => alEditarDato('yape', 'correo', v)} error={erroresPago.correo} autoComplete="email" deshabilitado={procesando} />
            <p className="postergacion-pago__ayuda">Celulares de prueba: {CELULARES_PRUEBA_YAPE.map((c) => `${c.numero} (${c.resultado})`).join(' · ')}. Código 123456.</p>
          </div>
        )}
        <div className="postergacion-pago__total">
          <span>Total a pagar</span>
          <strong>{formatearPrecio(comparacion.montoAPagar, pasaje.moneda)}</strong>
        </div>
      </div>
    </>
  )
}

export function PasoPago({
  pasaje, comparacion, metodo, alCambiarMetodo, procesando, avisoPago, intentos,
  datosPago, erroresPago, alEditarDato, esPrueba, aceptaTerminos, alCambiarTerminos,
}) {
  const real = Boolean(pasaje.deCompraReal)

  return (
    <div className="postergacion-paso">
      <div className="postergacion-paso__cabecera">
        <h2 className="postergacion-paso__titulo" tabIndex={-1} data-foco-paso>Paga la diferencia</h2>
        <p className="postergacion-paso__texto">
          Solo pagas {formatearPrecio(comparacion.montoAPagar, pasaje.moneda)}. Tu pasaje no cambia hasta que el pago sea aprobado.
        </p>
      </div>

      <div className="postergacion-pago">
        {real ? (
          <PasarelaPago
            total={comparacion.montoAPagar}
            esPrueba={esPrueba}
            aceptaTerminos={aceptaTerminos}
            alCambiarTerminos={alCambiarTerminos}
            bloqueado={procesando}
          />
        ) : (
          <PagoSimulado
            pasaje={pasaje}
            comparacion={comparacion}
            metodo={metodo}
            alCambiarMetodo={alCambiarMetodo}
            procesando={procesando}
            datosPago={datosPago}
            erroresPago={erroresPago}
            alEditarDato={alEditarDato}
          />
        )}

        {avisoPago && (
          <p
            className={`postergacion-aviso postergacion-aviso--${avisoPago.tipo === 'pendiente' ? 'aviso' : 'error'}`}
            role="alert"
          >
            <strong>
              {avisoPago.tipo === 'pendiente' ? 'Pago pendiente. ' : avisoPago.tipo === 'rechazado' ? 'Pago rechazado. ' : 'No se pudo procesar. '}
            </strong>
            {avisoPago.mensaje}{' '}
            {avisoPago.tipo === 'pendiente'
              ? 'Tu viaje y tu asiento originales se conservan. No se cobrará otra vez hasta conocer el resultado.'
              : 'Tu viaje y tu asiento originales se conservan; puedes reintentar.'}
          </p>
        )}

        {!real && intentos.length > 0 && (
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
