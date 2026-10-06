import { useState } from 'react'
import { ModalBase } from '../comunes/ModalBase'
import { CampoTexto } from '../comunes/CampoTexto'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { BotonGoogle } from '../comunes/BotonGoogle'
import { AvisoAutenticacion } from './AvisoAutenticacion'
import { ICONO_CANDADO, ICONO_CORREO } from './iconosAutenticacion'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import './autenticacion.css'

export function ModalInicioSesion({ abierto, alCerrar, alIrACrearCuenta }) {
  const { iniciarSesion, iniciarSesionConGoogle } = useAutenticacion()
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

  async function manejarGoogle(credencial) {
    setError('')
    setCargando(true)
    try {
      await iniciarSesionConGoogle(credencial)
      alCerrar()
    } catch (err) {
      setError(err.message ?? 'No se pudo iniciar sesión con Google.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <ModalBase
      titulo="Iniciar sesión"
      subtitulo="Ingresa a tu cuenta para ver tus pasajes y tickets."
      abierto={abierto}
      alCerrar={alCerrar}
    >
      <BotonGoogle alCredencial={manejarGoogle} alError={setError} deshabilitado={cargando} />

      <div className="divisor-o formulario-autenticacion__divisor">
        <span>o continúa con tu correo</span>
      </div>

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

        <div className="formulario-autenticacion__acciones">
          <BotonPrincipal tipo="submit" deshabilitado={cargando} cargando={cargando} ancho="100%">
            {cargando ? 'Ingresando…' : 'Iniciar sesión'}
          </BotonPrincipal>
        </div>
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
