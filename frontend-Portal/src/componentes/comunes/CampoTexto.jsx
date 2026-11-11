import { useId, useState } from 'react'
import './campoTexto.css'

const ICONO_OJO = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
)

const ICONO_OJO_TACHADO = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 4.5 20 20.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M9.6 6.1A9.4 9.4 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.8 16.8 0 0 1-2.6 3.4M6.7 7.9A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5c.9 0 1.7-.1 2.5-.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 10a2.8 2.8 0 0 0 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

/**
 * Campo de texto del sistema de diseño.
 *
 * Props añadidas (todas opcionales, el comportamiento por defecto no cambia):
 * · `alternarVisibilidad` — en campos de contraseña añade el botón mostrar/ocultar.
 * · `deshabilitado` — estado disabled visual y funcional.
 * · `autoEnfocar` — enfoca el campo al montarse (p. ej. al cambiar de paso en un modal).
 * · `accion` — nodo opcional alineado a la derecha de la etiqueta (p. ej. "¿Olvidaste tu contraseña?").
 *
 * La accesibilidad se resuelve aquí una sola vez: `aria-invalid` cuando hay
 * error y `aria-describedby` apuntando al mensaje de error o de ayuda, de modo
 * que los lectores de pantalla anuncien el motivo del fallo al enfocar.
 */
export function CampoTexto({
  etiqueta,
  tipo = 'text',
  valor,
  alCambiar,
  marcador,
  requerido,
  error,
  autoComplete,
  icono,
  modoEntrada,
  ayuda,
  alternarVisibilidad = false,
  deshabilitado = false,
  accion,
  autoEnfocar = false,
}) {
  const idBase = useId()
  const idMensaje = `${idBase}-mensaje`
  const [visible, setVisible] = useState(false)

  const esContrasena = tipo === 'password'
  const conAlternar = esContrasena && alternarVisibilidad
  const tipoEfectivo = conAlternar && visible ? 'text' : tipo
  const hayMensaje = Boolean(error || ayuda)

  const clasesCampo = [
    'campo-texto',
    icono ? 'campo-texto--con-icono' : '',
    conAlternar ? 'campo-texto--con-accion' : '',
    deshabilitado ? 'campo-texto--deshabilitado' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <label className={clasesCampo} htmlFor={idBase}>
      <span className="campo-texto__cabecera">
        <span className="campo-texto__etiqueta">{etiqueta}</span>
        {accion && <span className="campo-texto__accion">{accion}</span>}
      </span>

      <span className="campo-texto__envoltura">
        {icono && (
          <span className="campo-texto__icono" aria-hidden="true">
            {icono}
          </span>
        )}
        <input
          id={idBase}
          className={`campo-texto__entrada ${error ? 'campo-texto__entrada--error' : ''}`}
          type={tipoEfectivo}
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
          placeholder={marcador}
          required={requerido}
          disabled={deshabilitado}
          autoFocus={autoEnfocar}
          autoComplete={autoComplete}
          inputMode={modoEntrada}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={hayMensaje ? idMensaje : undefined}
        />
        {conAlternar && (
          <button
            type="button"
            className="campo-texto__ojo"
            onClick={() => setVisible((actual) => !actual)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            disabled={deshabilitado}
            tabIndex={deshabilitado ? -1 : 0}
          >
            {visible ? ICONO_OJO_TACHADO : ICONO_OJO}
          </button>
        )}
      </span>

      {error ? (
        <span className="campo-texto__error" id={idMensaje}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 7.5v5.5M12 16.2v.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {error}
        </span>
      ) : (
        ayuda && (
          <span className="campo-texto__ayuda" id={idMensaje}>
            {ayuda}
          </span>
        )
      )}
    </label>
  )
}
