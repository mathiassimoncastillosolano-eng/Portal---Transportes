import { useEffect, useRef, useState } from 'react'
import {
  cargarGoogle,
  inicializarGoogle,
  registrarManejadorCredencial,
} from '../../servicios/googleServicio'
import { useTema } from '../../hooks/useTema'
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

/** Ancho que Google debe dibujar, acotado a los límites que acepta GIS. */
function medirAncho(elemento) {
  return Math.min(400, Math.max(200, Math.round(elemento?.offsetWidth || 320)))
}

/**
 * "Continuar con Google" con Google Identity Services.
 *
 * Google dibuja su botón oficial y, al autenticarse el usuario, entrega un ID
 * token (`credential`) que se pasa a `alCredencial`; el backend lo valida.
 * Mientras la librería carga (o si falla), se muestra el botón con el estilo
 * propio de la aplicación.
 *
 * Integración con el modo oscuro
 * ------------------------------
 * El botón lo renderiza Google dentro de su propio contenedor, así que el CSS
 * de la aplicación no puede repintarlo: por eso antes aparecía un bloque
 * blanco sobre el lienzo oscuro. La solución es pedirle a GIS su variante
 * oficial oscura (`theme: 'filled_black'`) cuando el tema es oscuro, y la
 * clara (`outline`) cuando es claro. Así el fondo del botón es oscuro, el
 * logotipo de Google conserva sus colores originales y no hay rectángulo
 * blanco alrededor. Al cambiar de tema se vuelve a dibujar.
 *
 * Nada de esto altera el flujo de OAuth: la configuración de `initialize`, el
 * callback de la credencial y el contrato con el backend son los mismos.
 */
export function BotonGoogle({ texto = 'Continuar con Google', alCredencial, alError, deshabilitado = false }) {
  const contenedor = useRef(null)
  const alCredencialRef = useRef(alCredencial)
  const alErrorRef = useRef(alError)
  const [listo, setListo] = useState(false)
  const { esOscuro } = useTema()

  alCredencialRef.current = alCredencial
  alErrorRef.current = alError

  useEffect(() => {
    let activo = true
    let quitarManejador = () => {}
    let observador

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

        const dibujar = () => {
          if (!activo || !contenedor.current) return
          // Se limpia antes de redibujar para que al cambiar de tema o de
          // ancho no queden dos botones apilados.
          contenedor.current.replaceChildren()
          google.accounts.id.renderButton(contenedor.current, {
            type: 'standard',
            theme: esOscuro ? 'filled_black' : 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            locale: 'es',
            width: medirAncho(contenedor.current),
          })
        }

        dibujar()
        setListo(true)

        // El ancho del botón lo fija Google en píxeles, así que hay que
        // redibujarlo cuando cambia el espacio disponible (giro de pantalla,
        // ventana redimensionada) para que siga ocupando todo el ancho.
        if (typeof ResizeObserver !== 'undefined') {
          let anchoPrevio = medirAncho(contenedor.current)
          observador = new ResizeObserver(() => {
            if (!contenedor.current) return
            const nuevo = medirAncho(contenedor.current.parentElement ?? contenedor.current)
            if (Math.abs(nuevo - anchoPrevio) > 8) {
              anchoPrevio = nuevo
              dibujar()
            }
          })
          if (contenedor.current.parentElement) observador.observe(contenedor.current.parentElement)
        }
      })
      .catch((error) => {
        if (activo) alErrorRef.current?.(error.message)
      })

    return () => {
      activo = false
      observador?.disconnect()
      quitarManejador()
    }
  }, [esOscuro])

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
