import { useEffect, useRef, useState } from 'react'
import {
  cargarGoogle,
  inicializarGoogle,
  registrarManejadorCredencial,
} from '../../servicios/googleServicio'
import './botones.css'

const ICONO_GOOGLE = (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z"
    />
    <path
      fill="#FBBC05"
      d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
    />
  </svg>
)

/**
 * "Continuar con Google" con Google Identity Services.
 *
 * Google dibuja su botón oficial y, al autenticarse el usuario, entrega un ID
 * token (`credential`) que se pasa a `alCredencial`; el backend lo valida.
 * Mientras la librería carga (o si falla), se muestra el botón con el estilo
 * propio de la aplicación.
 */
export function BotonGoogle({ texto = 'Continuar con Google', alCredencial, alError, deshabilitado = false }) {
  const contenedor = useRef(null)
  const alCredencialRef = useRef(alCredencial)
  const alErrorRef = useRef(alError)
  const [listo, setListo] = useState(false)

  alCredencialRef.current = alCredencial
  alErrorRef.current = alError

  useEffect(() => {
    let activo = true
    let quitarManejador = () => {}

    cargarGoogle()
      .then((google) => {
        if (!activo || !contenedor.current) return
        inicializarGoogle(google)
        quitarManejador = registrarManejadorCredencial((respuesta) => {
          if (respuesta?.credential) {
            alCredencialRef.current?.(respuesta.credential)
          } else {
            alErrorRef.current?.('No se recibió la credencial de Google. Inténtalo de nuevo.')
          }
        })
        google.accounts.id.renderButton(contenedor.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          locale: 'es',
          width: Math.min(400, Math.max(200, Math.round(contenedor.current.offsetWidth || 320))),
        })
        setListo(true)
      })
      .catch((error) => {
        if (activo) alErrorRef.current?.(error.message)
      })

    return () => {
      activo = false
      quitarManejador()
    }
  }, [])

  return (
    <div className="boton-google-contenedor">
      {/* El contenedor de Google siempre existe para poder medirlo y dibujar en él. */}
      <div
        ref={contenedor}
        className={`boton-google-contenedor__gis${deshabilitado ? ' boton-google-contenedor__gis--bloqueado' : ''}`}
        hidden={!listo}
        aria-hidden={!listo}
      />
      {!listo && (
        <button type="button" className="boton-google" disabled>
          <span className="boton-google__icono" aria-hidden="true">{ICONO_GOOGLE}</span>
          {texto}
        </button>
      )}
    </div>
  )
}
