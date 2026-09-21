import { useState } from 'react'
import { ModalBase } from '../comunes/ModalBase'
import { CampoTexto } from '../comunes/CampoTexto'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { BotonGoogle } from '../comunes/BotonGoogle'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import './autenticacion.css'

const VALORES_INICIALES = {
  nombres: '',
  apellidos: '',
  correo: '',
  telefono: '',
  contrasena: '',
  confirmarContrasena: '',
}

export function FormularioRegistro({ abierto, alCerrar, alIrAIniciarSesion }) {
  const { registrarUsuario } = useAutenticacion()
  const [valores, setValores] = useState(VALORES_INICIALES)
  const [errores, setErrores] = useState({})
  const [cargando, setCargando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState('')

  function actualizarCampo(campo, valor) {
    setValores((actual) => ({ ...actual, [campo]: valor }))
  }

  function validar() {
    const nuevosErrores = {}
    if (!valores.nombres.trim()) nuevosErrores.nombres = 'Ingresa tus nombres.'
    if (!valores.apellidos.trim()) nuevosErrores.apellidos = 'Ingresa tus apellidos.'
    if (!/^\S+@\S+\.\S+$/.test(valores.correo)) nuevosErrores.correo = 'Ingresa un correo válido.'
    if (valores.telefono.trim().length < 6) nuevosErrores.telefono = 'Ingresa un teléfono válido.'
    if (valores.contrasena.length < 6) nuevosErrores.contrasena = 'Debe tener al menos 6 caracteres.'
    if (valores.confirmarContrasena !== valores.contrasena) {
      nuevosErrores.confirmarContrasena = 'Las contraseñas no coinciden.'
    }
    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  async function manejarEnvio(evento) {
    evento.preventDefault()
    setErrorGeneral('')
    if (!validar()) return

    setCargando(true)
    try {
      await registrarUsuario(valores)
      setValores(VALORES_INICIALES)
      alCerrar()
    } catch (err) {
      setErrorGeneral(err.message ?? 'No se pudo crear la cuenta.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <ModalBase
      titulo="Crear cuenta"
      subtitulo="Regístrate para comprar pasajes y guardar tus tickets."
      abierto={abierto}
      alCerrar={alCerrar}
    >
      <BotonGoogle texto="Registrarte con Google" />

      <div className="divisor-o formulario-autenticacion__divisor">o regístrate con tu correo</div>

      <form className="formulario-autenticacion" onSubmit={manejarEnvio}>
        <div className="formulario-autenticacion__fila">
          <CampoTexto
            etiqueta="Nombres"
            valor={valores.nombres}
            alCambiar={(valor) => actualizarCampo('nombres', valor)}
            error={errores.nombres}
            requerido
          />
          <CampoTexto
            etiqueta="Apellidos"
            valor={valores.apellidos}
            alCambiar={(valor) => actualizarCampo('apellidos', valor)}
            error={errores.apellidos}
            requerido
          />
        </div>

        <CampoTexto
          etiqueta="Correo electrónico"
          tipo="email"
          valor={valores.correo}
          alCambiar={(valor) => actualizarCampo('correo', valor)}
          error={errores.correo}
          requerido
          autoComplete="email"
        />

        <CampoTexto
          etiqueta="Teléfono"
          tipo="tel"
          valor={valores.telefono}
          alCambiar={(valor) => actualizarCampo('telefono', valor)}
          error={errores.telefono}
          requerido
        />

        <div className="formulario-autenticacion__fila">
          <CampoTexto
            etiqueta="Contraseña"
            tipo="password"
            valor={valores.contrasena}
            alCambiar={(valor) => actualizarCampo('contrasena', valor)}
            error={errores.contrasena}
            requerido
            autoComplete="new-password"
          />
          <CampoTexto
            etiqueta="Confirmar contraseña"
            tipo="password"
            valor={valores.confirmarContrasena}
            alCambiar={(valor) => actualizarCampo('confirmarContrasena', valor)}
            error={errores.confirmarContrasena}
            requerido
            autoComplete="new-password"
          />
        </div>

        {errorGeneral && <p className="formulario-autenticacion__error">{errorGeneral}</p>}

        <BotonPrincipal tipo="submit" deshabilitado={cargando} ancho="100%">
          {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
        </BotonPrincipal>
      </form>

      <p className="formulario-autenticacion__pie">
        ¿Ya tienes una cuenta?{' '}
        <button type="button" className="formulario-autenticacion__enlace" onClick={alIrAIniciarSesion}>
          Iniciar sesión
        </button>
      </p>
    </ModalBase>
  )
}
