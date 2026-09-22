import { CampoTexto } from '../comunes/CampoTexto'
import './pasarelaPago.css'

export const VALORES_PAGO_INICIALES = { numeroTarjeta: '', vencimiento: '', cvv: '', titular: '' }

export function validarPago(valores) {
  const errores = {}

  const digitosTarjeta = valores.numeroTarjeta.replace(/\s/g, '')
  if (!digitosTarjeta) errores.numeroTarjeta = 'Ingresa el número de tarjeta.'
  else if (digitosTarjeta.length !== 16) errores.numeroTarjeta = 'El número de tarjeta debe tener 16 dígitos.'

  if (!valores.vencimiento) errores.vencimiento = 'Ingresa la fecha de vencimiento.'
  else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(valores.vencimiento)) errores.vencimiento = 'Usa el formato MM/AA.'

  if (!valores.cvv) errores.cvv = 'Ingresa el CVV.'
  else if (!/^\d{3,4}$/.test(valores.cvv)) errores.cvv = 'El CVV debe tener 3 o 4 dígitos.'

  if (!valores.titular.trim()) errores.titular = 'Ingresa el nombre del titular.'

  return errores
}

function formatearNumeroTarjeta(valor) {
  return valor.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function formatearVencimiento(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 4)
  if (digitos.length <= 2) return digitos
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`
}

export function PasarelaPago({ valores, errores, camposTocados, alCambiarCampo, alTocarCampo, metodo, alCambiarMetodo }) {
  return (
    <div className="pasarela-pago">
      <div className="pasarela-pago__metodos" role="tablist" aria-label="Método de pago">
        <button
          type="button"
          role="tab"
          aria-selected={metodo === 'tarjeta'}
          className={`pasarela-pago__metodo ${metodo === 'tarjeta' ? 'pasarela-pago__metodo--activo' : ''}`}
          onClick={() => alCambiarMetodo('tarjeta')}
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
          aria-selected={metodo === 'billetera'}
          className={`pasarela-pago__metodo ${metodo === 'billetera' ? 'pasarela-pago__metodo--activo' : ''}`}
          onClick={() => alCambiarMetodo('billetera')}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="2" y="4" width="16" height="12" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 8h16" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="14" cy="12" r="1.4" fill="currentColor" />
          </svg>
          Billetera móvil
        </button>
      </div>

      {metodo === 'tarjeta' ? (
        <div className="pasarela-pago__formulario">
          <div className="pasarela-pago__tarjeta-vista" aria-hidden="true">
            <div className="pasarela-pago__tarjeta-fila">
              <svg width="30" height="22" viewBox="0 0 30 22" fill="none">
                <rect width="30" height="22" rx="4" fill="rgba(255,255,255,0.16)" />
                <rect x="5" y="6" width="10" height="8" rx="2" fill="rgba(255,255,255,0.5)" />
              </svg>
              <span className="pasarela-pago__tarjeta-marca">RutaLibre Pay</span>
            </div>
            <p className="pasarela-pago__tarjeta-numero">
              {valores.numeroTarjeta || '•••• •••• •••• ••••'}
            </p>
            <div className="pasarela-pago__tarjeta-fila pasarela-pago__tarjeta-fila--pie">
              <span>{valores.titular || 'NOMBRE DEL TITULAR'}</span>
              <span>{valores.vencimiento || 'MM/AA'}</span>
            </div>
          </div>

          <div onBlur={() => alTocarCampo('numeroTarjeta')}>
            <CampoTexto
              etiqueta="Número de tarjeta"
              valor={valores.numeroTarjeta}
              alCambiar={(valor) => alCambiarCampo('numeroTarjeta', formatearNumeroTarjeta(valor))}
              marcador="0000 0000 0000 0000"
              requerido
              error={camposTocados.numeroTarjeta ? errores.numeroTarjeta : undefined}
              autoComplete="cc-number"
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
                error={camposTocados.vencimiento ? errores.vencimiento : undefined}
                autoComplete="cc-exp"
              />
            </div>
            <div onBlur={() => alTocarCampo('cvv')}>
              <CampoTexto
                etiqueta="CVV"
                tipo="password"
                valor={valores.cvv}
                alCambiar={(valor) => alCambiarCampo('cvv', valor.replace(/\D/g, '').slice(0, 4))}
                marcador="123"
                requerido
                error={camposTocados.cvv ? errores.cvv : undefined}
                autoComplete="cc-csc"
              />
            </div>
          </div>

          <div onBlur={() => alTocarCampo('titular')}>
            <CampoTexto
              etiqueta="Nombre del titular"
              valor={valores.titular}
              alCambiar={(valor) => alCambiarCampo('titular', valor)}
              marcador="Como figura en la tarjeta"
              requerido
              error={camposTocados.titular ? errores.titular : undefined}
              autoComplete="cc-name"
            />
          </div>
        </div>
      ) : (
        <div className="pasarela-pago__billetera">
          <div className="pasarela-pago__qr" aria-hidden="true">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
              <rect width="120" height="120" rx="12" fill="var(--color-azul-50)" />
              {Array.from({ length: 36 }).map((_, indice) => (
                (indice * 7) % 5 !== 0 && (
                  <rect
                    key={indice}
                    x={8 + (indice % 6) * 17}
                    y={8 + Math.floor(indice / 6) * 17}
                    width="13"
                    height="13"
                    rx="2"
                    fill="var(--color-azul-800)"
                  />
                )
              ))}
            </svg>
          </div>
          <p className="pasarela-pago__billetera-texto">
            Escanea el código con tu aplicación de billetera móvil para completar el pago.
          </p>
          <p className="pasarela-pago__billetera-demo">Vista de demostración — no procesa pagos reales.</p>
        </div>
      )}

      <p className="pasarela-pago__seguridad">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1 12 3v3.5C12 10 9.8 12 7 13 4.2 12 2 10 2 6.5V3l5-2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        Pago simulado — no se procesa ninguna transacción real.
      </p>
    </div>
  )
}
