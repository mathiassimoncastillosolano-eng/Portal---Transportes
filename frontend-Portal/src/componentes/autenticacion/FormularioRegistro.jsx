import { useEffect, useState } from 'react'
import { ModalBase } from '../comunes/ModalBase'
import { CampoTexto } from '../comunes/CampoTexto'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { BotonGoogle } from '../comunes/BotonGoogle'
import { AvisoAutenticacion } from './AvisoAutenticacion'
import {
  ICONO_CANDADO,
  ICONO_CORREO,
  ICONO_TELEFONO,
  ICONO_USUARIO,
} from './iconosAutenticacion'
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
  const { registrarUsuario, iniciarSesionConGoogle } = useAutenticacion()
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

  async function manejarGoogle(credencial) {
    setErrorGeneral('')
    setCargando(true)
    try {
      await iniciarSesionConGoogle(credencial)
      alCerrar()
    } catch (err) {
      setErrorGeneral(err.message ?? 'No se pudo continuar con Google.')
    } finally {
      setCargando(false)
    }
  }

  if (cuentaCreada) {
    return (
      <ModalBase titulo="Cuenta creada" abierto={abierto} alCerrar={alCerrar}>
        <div className="formulario-autenticacion__exito">
          <span className="formulario-autenticacion__exito-icono" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.6l4.2 4.2L19 7.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="formulario-autenticacion__exito-texto" role="status">
            Tu cuenta se creó correctamente. Inicia sesión para continuar.
          </p>
          <BotonPrincipal onClick={alIrAIniciarSesion} ancho="100%">
            Iniciar sesión
          </BotonPrincipal>
        </div>
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
      <BotonGoogle alCredencial={manejarGoogle} alError={setErrorGeneral} deshabilitado={cargando} />

      <div className="divisor-o formulario-autenticacion__divisor">
        <span>o regístrate con tu correo</span>
      </div>

      <form className="formulario-autenticacion" onSubmit={manejarEnvio}>
        <div className="formulario-autenticacion__fila">
          <CampoTexto
            etiqueta="Nombres"
            valor={valores.nombres}
            alCambiar={(valor) => actualizarCampo('nombres', valor)}
            error={errores.nombres}
            requerido
            autoComplete="given-name"
            icono={ICONO_USUARIO}
            deshabilitado={cargando}
          />
          <CampoTexto
            etiqueta="Apellidos"
            valor={valores.apellidos}
            alCambiar={(valor) => actualizarCampo('apellidos', valor)}
            error={errores.apellidos}
            requerido
            autoComplete="family-name"
            icono={ICONO_USUARIO}
            deshabilitado={cargando}
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
          marcador="tucorreo@ejemplo.com"
          icono={ICONO_CORREO}
          deshabilitado={cargando}
        />

        <CampoTexto
          etiqueta="Teléfono (opcional)"
          tipo="tel"
          valor={valores.telefono}
          alCambiar={(valor) => actualizarCampo('telefono', valor)}
          error={errores.telefono}
          icono={ICONO_TELEFONO}
          modoEntrada="tel"
          deshabilitado={cargando}
        />

        <div className="formulario-autenticacion__fila">
          <CampoTexto
            etiqueta="Contraseña"
            tipo="password"
            valor={valores.contrasena}
            alCambiar={(valor) => actualizarCampo('contrasena', valor)}
            error={errores.contrasena}
            ayuda="Mínimo 8 caracteres"
            requerido
            autoComplete="new-password"
            icono={ICONO_CANDADO}
            alternarVisibilidad
            deshabilitado={cargando}
          />
          <CampoTexto
            etiqueta="Confirmar contraseña"
            tipo="password"
            valor={valores.confirmarContrasena}
            alCambiar={(valor) => actualizarCampo('confirmarContrasena', valor)}
            error={errores.confirmarContrasena}
            requerido
            autoComplete="new-password"
            icono={ICONO_CANDADO}
            alternarVisibilidad
            deshabilitado={cargando}
          />
        </div>

        <AvisoAutenticacion tono="error">{errorGeneral}</AvisoAutenticacion>

        <div className="formulario-autenticacion__acciones">
          <BotonPrincipal tipo="submit" deshabilitado={cargando} cargando={cargando} ancho="100%">
            {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
          </BotonPrincipal>
        </div>
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
