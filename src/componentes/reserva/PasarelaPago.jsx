import { CampoTexto } from '../comunes/CampoTexto'
import { CampoSeleccion } from '../comunes/CampoSeleccion'
import {
  CUOTAS_DISPONIBLES,
  MARCAS_TARJETA,
  TIPOS_DOCUMENTO,
  detectarMarca,
  formatearNumeroTarjeta,
  formatearVencimiento,
  montoPorCuota,
  soloDigitos,
} from '../../utilidades/pagoMercadoPago'
import { formatearPrecio } from '../../utilidades/formato'
import './pasarelaPago.css'

// Yape permite al usuario fijar su tope por operación en la app (S/ 500, 900 o 2000).
const TOPE_MAXIMO_YAPE = 2000

const OPCIONES_DOCUMENTO = TIPOS_DOCUMENTO.map((tipo) => ({ valor: tipo.id, texto: tipo.nombre }))

const TARJETAS_PRUEBA = [
  { marca: 'Visa', numero: '4009 1753 3280 6176', cvv: '123' },
  { marca: 'Mastercard', numero: '5031 7557 3453 0604', cvv: '123' },
  { marca: 'American Express', numero: '3711 803032 57522', cvv: '1234' },
]

/**
 * Formulario de pago con los campos que exige Checkout API de Mercado Pago
 * en Perú. Es totalmente controlado: los valores, errores y campos tocados
 * viven en PaginaReserva. Las reglas están en utilidades/pagoMercadoPago.
 */
export function PasarelaPago({
  metodo,
  alCambiarMetodo,
  valoresTarjeta,
  valoresYape,
  errores,
  camposTocados,
  alCambiarCampo,
  alTocarCampo,
  total,
  bloqueado,
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

      <fieldset className="pasarela-pago__campos" disabled={bloqueado}>
        {metodo === 'tarjeta' ? (
          <FormularioTarjeta
            valores={valoresTarjeta}
            errorDe={errorDe}
            alCambiarCampo={alCambiarCampo}
            alTocarCampo={alTocarCampo}
            total={total}
          />
        ) : (
          <FormularioYape
            valores={valoresYape}
            errorDe={errorDe}
            alCambiarCampo={alCambiarCampo}
            alTocarCampo={alTocarCampo}
            total={total}
          />
        )}
      </fieldset>

      <details className="pasarela-pago__prueba">
        <summary>Datos de prueba para la demo</summary>
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
              Como en el sandbox de Mercado Pago, el nombre del titular decide el resultado: <code>APRO</code> aprueba,{' '}
              <code>CONT</code> queda pendiente, <code>FUND</code> rechaza por fondos, <code>SECU</code> por CVV,{' '}
              <code>OTHE</code> por otro motivo. Cualquier otro nombre se aprueba.
            </p>
          </>
        ) : (
          <p>Usa cualquier celular que empiece con 9 y un código de 6 dígitos, por ejemplo 123456.</p>
        )}
      </details>

      <p className="pasarela-pago__seguridad">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1 12 3v3.5C12 10 9.8 12 7 13 4.2 12 2 10 2 6.5V3l5-2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        Procesado con Mercado Pago · Modo demo, no se realizan cobros reales.
      </p>
    </div>
  )
}

function FormularioTarjeta({ valores, errorDe, alCambiarCampo, alTocarCampo, total }) {
  const marca = detectarMarca(valores.numeroTarjeta)
  const longitudCvv = marca?.longitudCvv ?? 3
  const tipoDocumento = TIPOS_DOCUMENTO.find((tipo) => tipo.id === valores.tipoDocumento)

  const opcionesCuotas = CUOTAS_DISPONIBLES.map((cuotas) => ({
    valor: cuotas,
    texto:
      cuotas === 1
        ? `1 cuota de ${formatearPrecio(total)}`
        : `${cuotas} cuotas de ${formatearPrecio(montoPorCuota(total, cuotas))}`,
  }))

  return (
    <div className="pasarela-pago__formulario">
      <div className="pasarela-pago__tarjeta-vista" aria-hidden="true">
        <div className="pasarela-pago__tarjeta-fila">
          <svg width="30" height="22" viewBox="0 0 30 22" fill="none">
            <rect width="30" height="22" rx="4" fill="rgba(255,255,255,0.16)" />
            <rect x="5" y="6" width="10" height="8" rx="2" fill="rgba(255,255,255,0.5)" />
          </svg>
          <span className="pasarela-pago__tarjeta-marca">{marca?.nombre ?? 'Tarjeta'}</span>
        </div>
        <p className="pasarela-pago__tarjeta-numero">{valores.numeroTarjeta || '•••• •••• •••• ••••'}</p>
        <div className="pasarela-pago__tarjeta-fila pasarela-pago__tarjeta-fila--pie">
          <span>{valores.titular || 'NOMBRE DEL TITULAR'}</span>
          <span>{valores.vencimiento || 'MM/AA'}</span>
        </div>
      </div>

      <ul className="pasarela-pago__marcas" aria-label="Tarjetas aceptadas">
        {Object.values(MARCAS_TARJETA).map((opcion) => (
          <li
            key={opcion.id}
            className={`pasarela-pago__marca ${marca?.id === opcion.id ? 'pasarela-pago__marca--activa' : ''}`}
          >
            {opcion.nombre}
          </li>
        ))}
      </ul>

      <div onBlur={() => alTocarCampo('numeroTarjeta')}>
        <CampoTexto
          etiqueta="Número de tarjeta"
          valor={valores.numeroTarjeta}
          alCambiar={(valor) => alCambiarCampo('numeroTarjeta', formatearNumeroTarjeta(valor))}
          marcador="0000 0000 0000 0000"
          requerido
          error={errorDe('numeroTarjeta')}
          autoComplete="cc-number"
          modoEntrada="numeric"
        />
      </div>

      <div onBlur={() => alTocarCampo('titular')}>
        <CampoTexto
          etiqueta="Nombre del titular"
          valor={valores.titular}
          alCambiar={(valor) => alCambiarCampo('titular', valor)}
          marcador="Como figura en la tarjeta"
          requerido
          error={errorDe('titular')}
          autoComplete="cc-name"
        />
      </div>

      <div className="pasarela-pago__fila">
        <div onBlur={() => alTocarCampo('vencimiento')}>
          <CampoTexto
            etiqueta="Vencimiento"
            valor={valores.vencimiento}
            alCambiar={(valor) => alCambiarCampo('vencimiento', formatearVencimiento(valor))}
            marcador="MM/AA"
            requerido
            error={errorDe('vencimiento')}
            autoComplete="cc-exp"
            modoEntrada="numeric"
          />
        </div>
        <div onBlur={() => alTocarCampo('cvv')}>
          <CampoTexto
            etiqueta="Código de seguridad"
            tipo="password"
            valor={valores.cvv}
            alCambiar={(valor) => alCambiarCampo('cvv', soloDigitos(valor).slice(0, longitudCvv))}
            marcador={longitudCvv === 4 ? '1234' : '123'}
            requerido
            error={errorDe('cvv')}
            autoComplete="cc-csc"
            modoEntrada="numeric"
            ayuda={marca?.id === 'amex' ? '4 dígitos en el frente' : '3 dígitos al reverso'}
          />
        </div>
      </div>

      <div className="pasarela-pago__fila pasarela-pago__fila--documento">
        <CampoSeleccion
          etiqueta="Tipo de documento"
          valor={valores.tipoDocumento}
          alCambiar={(valor) => {
            alCambiarCampo('tipoDocumento', valor)
            alTocarCampo('tipoDocumento')
          }}
          opciones={OPCIONES_DOCUMENTO}
          requerido
          error={errorDe('tipoDocumento')}
        />
        <div onBlur={() => alTocarCampo('numeroDocumento')}>
          <CampoTexto
            etiqueta="Número de documento"
            valor={valores.numeroDocumento}
            alCambiar={(valor) => alCambiarCampo('numeroDocumento', valor.replace(/[^A-Za-z0-9]/g, '').slice(0, 20))}
            marcador={tipoDocumento?.ayuda ?? ''}
            requerido
            error={errorDe('numeroDocumento')}
            modoEntrada={valores.tipoDocumento === 'DNI' || valores.tipoDocumento === 'RUC' ? 'numeric' : undefined}
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
          ayuda="Aquí te enviaremos el comprobante de pago."
        />
      </div>

      <CampoSeleccion
        etiqueta="Cuotas"
        valor={valores.cuotas}
        alCambiar={(valor) => alCambiarCampo('cuotas', Number(valor))}
        opciones={opcionesCuotas}
        requerido
        error={errorDe('cuotas')}
      />
      <p className="pasarela-pago__nota">
        Las cuotas aplican solo a tarjetas de crédito. En producción, Mercado Pago muestra las cuotas e intereses que
        ofrece el banco de tu tarjeta.
      </p>
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
          ayuda="Aquí te enviaremos el comprobante de pago."
        />
      </div>
    </div>
  )
}
