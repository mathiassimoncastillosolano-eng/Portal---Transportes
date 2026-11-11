import { useId } from 'react'
import { LONGITUD_CODIGO, normalizarCodigo } from '../../utilidades/recuperacionContrasena'
import './recuperarContrasena.css'

/**
 * Campo para el código de verificación. Es un único <input> real (accesible, admite pegar
 * el código completo y el autocompletado "código de un solo uso" del móvil) con aspecto de casillas.
 */
export function CampoCodigo({ etiqueta = 'Código de verificación', valor, alCambiar, error, deshabilitado = false, autoEnfocar = false }) {
  const idBase = useId()
  const idMensaje = `${idBase}-mensaje`

  return (
    <label className="campo-codigo" htmlFor={idBase}>
      <span className="campo-codigo__etiqueta">{etiqueta}</span>
      <input
        id={idBase}
        className={`campo-codigo__entrada${error ? ' campo-codigo__entrada--error' : ''}`}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        autoFocus={autoEnfocar}
        maxLength={LONGITUD_CODIGO + 8} // margen para pegar "123 456"; se normaliza al escribir
        value={valor}
        disabled={deshabilitado}
        placeholder={'•'.repeat(LONGITUD_CODIGO)}
        onChange={(evento) => alCambiar(normalizarCodigo(evento.target.value))}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? idMensaje : undefined}
      />
      {error && (
        <span className="campo-codigo__error" id={idMensaje}>
          {error}
        </span>
      )}
    </label>
  )
}
