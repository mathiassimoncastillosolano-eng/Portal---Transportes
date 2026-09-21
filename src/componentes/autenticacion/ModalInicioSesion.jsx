import { useState } from 'react'
import { ModalBase } from '../comunes/ModalBase'
import { CampoTexto } from '../comunes/CampoTexto'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { BotonGoogle } from '../comunes/BotonGoogle'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { usuarioDemo } from '../../datos/usuarios'
import './autenticacion.css'

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

export function ModalInicioSesion({ abierto, alCerrar, alIrACrearCuenta }) {
  const { iniciarSesion } = useAutenticacion()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function manejarEnvio(evento) {
    evento.preventDefault()
    setError('')
    setCargando(true)
    try {
      await iniciarSesion(correo, contrasena)
      alCerrar()
      setCorreo('')
      setContrasena('')
    } catch (err) {
      setError(err.message ?? 'No se pudo iniciar sesión.')
    } finally {
      setCargando(false)
    }
  }

  function usarCuentaDemo() {
    setCorreo(usuarioDemo.correo)
    setContrasena(usuarioDemo.contrasena)
  }

  return (
    <ModalBase
      titulo="Iniciar sesión"
      subtitulo="Ingresa a tu cuenta para ver tus pasajes y tickets."
      abierto={abierto}
      alCerrar={alCerrar}
    >
      <BotonGoogle />

      <div className="divisor-o formulario-autenticacion__divisor">o continúa con tu correo</div>

      <form className="formulario-autenticacion" onSubmit={manejarEnvio}>
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

        {error && <p className="formulario-autenticacion__error">{error}</p>}

        <BotonPrincipal tipo="submit" deshabilitado={cargando} ancho="100%">
          {cargando ? 'Ingresando…' : 'Iniciar sesión'}
        </BotonPrincipal>

        <button type="button" className="formulario-autenticacion__demo" onClick={usarCuentaDemo}>
          Usar cuenta de demostración
        </button>
      </form>

      <p className="formulario-autenticacion__pie">
        ¿No tienes una cuenta?{' '}
        <button type="button" className="formulario-autenticacion__enlace" onClick={alIrACrearCuenta}>
          Crear cuenta
        </button>
      </p>
    </ModalBase>
  )
}
