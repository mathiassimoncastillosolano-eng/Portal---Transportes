import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { CampoTexto } from '../../componentes/comunes/CampoTexto'
import { BotonPrincipal } from '../../componentes/comunes/BotonPrincipal'
import { BotonGoogle } from '../../componentes/comunes/BotonGoogle'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { usuarioDemo } from '../../datos/usuarios'
import './autenticacionPagina.css'

const ICONO_CORREO = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="m4 6.5 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ICONO_CANDADO = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="10.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

export function PaginaIniciarSesion() {
  const { iniciarSesion } = useAutenticacion()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [correo, setCorreo] = useState(ubicacion.state?.correoRegistro ?? '')
  const [contrasena, setContrasena] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function manejarEnvio(evento) {
    evento.preventDefault()
    setError('')
    setCargando(true)
    try {
      await iniciarSesion(correo, contrasena)
      navegar('/perfil')
    } catch (err) {
      setError(err.message ?? 'No se pudo iniciar sesión.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <section className="pagina-autenticacion">
      <div className="pagina-autenticacion__marca">
        <div className="pagina-autenticacion__marca-logo">
          <span className="pagina-autenticacion__marca-isotipo">RL</span>
          RutaLibre
        </div>

        <div className="pagina-autenticacion__marca-cuerpo">
          <h1 className="pagina-autenticacion__marca-titulo">Bienvenido de vuelta</h1>
          <p className="pagina-autenticacion__marca-texto">
            Ingresa a tu cuenta para gestionar tus viajes, revisar tus tickets
            electrónicos y comprar tu próximo pasaje en segundos.
          </p>
        </div>

        <ul className="pagina-autenticacion__marca-lista">
          <li className="pagina-autenticacion__marca-item">
            <span className="pagina-autenticacion__marca-item-icono">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17l9-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            Tickets electrónicos con código QR
          </li>
          <li className="pagina-autenticacion__marca-item">
            <span className="pagina-autenticacion__marca-item-icono">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17l9-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            Historial de viajes siempre disponible
          </li>
          <li className="pagina-autenticacion__marca-item">
            <span className="pagina-autenticacion__marca-item-icono">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17l9-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            Más de 40 rutas a nivel nacional
          </li>
        </ul>
      </div>

      <div className="pagina-autenticacion__panel">
        <div className="pagina-autenticacion__tarjeta animar-aparicion">
          <h2 className="pagina-autenticacion__titulo">Iniciar sesión</h2>
          {ubicacion.state?.cuentaCreada && (
            <p role="status">Tu cuenta se creó correctamente. Inicia sesión para continuar.</p>
          )}
          <p className="pagina-autenticacion__subtitulo">
            Ingresa a tu cuenta para ver tus pasajes y tickets electrónicos.
          </p>

          <div className="pagina-autenticacion__social">
            <BotonGoogle />
          </div>

          <div className="divisor-o pagina-autenticacion__divisor">o continúa con tu correo</div>

          <form className="pagina-autenticacion__formulario" onSubmit={manejarEnvio}>
            <CampoTexto
              etiqueta="Correo electrónico"
              tipo="email"
              valor={correo}
              alCambiar={setCorreo}
              marcador="tucorreo@ejemplo.com"
              requerido
              autoComplete="email"
              icono={ICONO_CORREO}
            />
            <CampoTexto
              etiqueta="Contraseña"
              tipo="password"
              valor={contrasena}
              alCambiar={setContrasena}
              marcador="••••••••"
              requerido
              autoComplete="current-password"
              icono={ICONO_CANDADO}
            />

            {error && <p className="pagina-autenticacion__error">{error}</p>}

            <BotonPrincipal tipo="submit" deshabilitado={cargando} ancho="100%">
              {cargando ? 'Ingresando…' : 'Iniciar sesión'}
            </BotonPrincipal>

            <button
              type="button"
              className="pagina-autenticacion__demo"
              onClick={() => {
                setCorreo(usuarioDemo.correo)
                setContrasena(usuarioDemo.contrasena)
              }}
            >
              Usar cuenta de demostración
            </button>
          </form>

          <p className="pagina-autenticacion__pie">
            ¿No tienes una cuenta?{' '}
            <NavLink to="/crear-cuenta" className="pagina-autenticacion__enlace">
              Crear cuenta
            </NavLink>
          </p>
        </div>
      </div>
    </section>
  )
}
