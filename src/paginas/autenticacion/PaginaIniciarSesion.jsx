import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { CampoTexto } from '../../componentes/comunes/CampoTexto'
import { BotonPrincipal } from '../../componentes/comunes/BotonPrincipal'
import { BotonGoogle } from '../../componentes/comunes/BotonGoogle'
import { AvisoAutenticacion } from '../../componentes/autenticacion/AvisoAutenticacion'
import { PanelMarcaAutenticacion } from '../../componentes/autenticacion/PanelMarcaAutenticacion'
import { ICONO_CANDADO, ICONO_CORREO } from '../../componentes/autenticacion/iconosAutenticacion'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { usuarioDemo } from '../../datos/usuarios'
import './autenticacionPagina.css'

const VENTAJAS = [
  'Tickets electrónicos con código QR',
  'Historial de viajes siempre disponible',
  'Más de 40 rutas a nivel nacional',
]

export function PaginaIniciarSesion() {
  const { iniciarSesion, iniciarSesionConGoogle } = useAutenticacion()
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

  async function manejarGoogle(credencial) {
    setError('')
    setCargando(true)
    try {
      await iniciarSesionConGoogle(credencial)
      navegar('/perfil')
    } catch (err) {
      setError(err.message ?? 'No se pudo iniciar sesión con Google.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <section className="pagina-autenticacion">
      <PanelMarcaAutenticacion
        titulo="Bienvenido de vuelta"
        texto="Ingresa a tu cuenta para gestionar tus viajes, revisar tus tickets electrónicos y comprar tu próximo pasaje en segundos."
        ventajas={VENTAJAS}
      />

      <div className="pagina-autenticacion__panel">
        <div className="pagina-autenticacion__tarjeta animar-aparicion">
          <header className="pagina-autenticacion__encabezado">
            <h2 className="pagina-autenticacion__titulo">Iniciar sesión</h2>
            <p className="pagina-autenticacion__subtitulo">
              Ingresa a tu cuenta para ver tus pasajes y tickets electrónicos.
            </p>
          </header>

          {ubicacion.state?.cuentaCreada && (
            <div className="pagina-autenticacion__aviso">
              <AvisoAutenticacion tono="exito">
                Tu cuenta se creó correctamente. Inicia sesión para continuar.
              </AvisoAutenticacion>
            </div>
          )}

          <div className="pagina-autenticacion__social">
            <BotonGoogle alCredencial={manejarGoogle} alError={setError} deshabilitado={cargando} />
          </div>

          <div className="divisor-o pagina-autenticacion__divisor">
            <span>o continúa con tu correo</span>
          </div>

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
              deshabilitado={cargando}
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
              alternarVisibilidad
              deshabilitado={cargando}
            />

            <AvisoAutenticacion tono="error">{error}</AvisoAutenticacion>

            <div className="pagina-autenticacion__acciones">
              <BotonPrincipal tipo="submit" deshabilitado={cargando} cargando={cargando} ancho="100%">
                {cargando ? 'Ingresando…' : 'Iniciar sesión'}
              </BotonPrincipal>

              <button
                type="button"
                className="pagina-autenticacion__demo"
                disabled={cargando}
                onClick={() => {
                  setCorreo(usuarioDemo.correo)
                  setContrasena(usuarioDemo.contrasena)
                }}
              >
                Usar cuenta de demostración
              </button>
            </div>
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
