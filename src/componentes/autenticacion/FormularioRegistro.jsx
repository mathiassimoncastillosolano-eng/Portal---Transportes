import { useEffect, useState } from 'react'
import { ModalBase } from '../comunes/ModalBase'
import { CampoTexto } from '../comunes/CampoTexto'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { validarRegistro } from '../../utilidades/validarRegistro'
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
  const [cuentaCreada, setCuentaCreada] = useState(false)

  useEffect(() => {
    if (!abierto) setCuentaCreada(false)
  }, [abierto])

  function actualizarCampo(campo, valor) {
    setValores((actual) => ({ ...actual, [campo]: valor }))
  }

  function validar() {
    const nuevosErrores = validarRegistro(valores)
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
      setCuentaCreada(true)
    } catch (err) {
      setErrorGeneral(err.detalles?.length ? err.detalles.join(' ') : (err.message ?? 'No se pudo crear la cuenta.'))
    } finally {
      setCargando(false)
    }
  }

  if (cuentaCreada) {
    return (
      <ModalBase titulo="Cuenta creada" abierto={abierto} alCerrar={alCerrar}>
        <p role="status">Tu cuenta se creó correctamente. Inicia sesión para continuar.</p>
        <BotonPrincipal onClick={alIrAIniciarSesion}>Iniciar sesión</BotonPrincipal>
      </ModalBase>
    )
  }

  return (
    <ModalBase
      titulo="Crear cuenta"
      subtitulo="Regístrate para comprar pasajes y guardar tus tickets."
      abierto={abierto}
      alCerrar={alCerrar}
    >
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
          etiqueta="Teléfono (opcional)"
          tipo="tel"
          valor={valores.telefono}
          alCambiar={(valor) => actualizarCampo('telefono', valor)}
          error={errores.telefono}
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
