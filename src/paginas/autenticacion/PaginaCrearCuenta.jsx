import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { CampoTexto } from '../../componentes/comunes/CampoTexto'
import { BotonPrincipal } from '../../componentes/comunes/BotonPrincipal'
import { BotonGoogle } from '../../componentes/comunes/BotonGoogle'
import { AvisoAutenticacion } from '../../componentes/autenticacion/AvisoAutenticacion'
import { PanelMarcaAutenticacion } from '../../componentes/autenticacion/PanelMarcaAutenticacion'
import {
  ICONO_CANDADO,
  ICONO_CORREO,
  ICONO_TELEFONO,
  ICONO_USUARIO,
} from '../../componentes/autenticacion/iconosAutenticacion'
import { validarRegistro } from '../../utilidades/validarRegistro'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import './autenticacionPagina.css'

const VALORES_INICIALES = {
  nombres: '',
  apellidos: '',
  correo: '',
  telefono: '',
  contrasena: '',
  confirmarContrasena: '',
}

const VENTAJAS = [
  'Registro rápido, sin complicaciones',
  'Cinco niveles de servicio a tu elección',
  'Atención al cliente las 24 horas',
]

export function PaginaCrearCuenta() {
  const { registrarUsuario, iniciarSesionConGoogle } = useAutenticacion()
  const navegar = useNavigate()
  const [valores, setValores] = useState(VALORES_INICIALES)
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [cargando, setCargando] = useState(false)

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
      const cuenta = await registrarUsuario(valores)
      navegar('/iniciar-sesion', {
        replace: true,
        state: { cuentaCreada: true, correoRegistro: cuenta.correo },
      })
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
      navegar('/perfil')
    } catch (err) {
      setErrorGeneral(err.message ?? 'No se pudo continuar con Google.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <section className="pagina-autenticacion">
      <PanelMarcaAutenticacion
        titulo="Únete a RutaLibre"
        texto="Crea tu cuenta y empieza a reservar pasajes en minutos, con tickets electrónicos y todo tu historial de viajes en un solo lugar."
        ventajas={VENTAJAS}
      />

      <div className="pagina-autenticacion__panel">
        <div className="pagina-autenticacion__tarjeta pagina-autenticacion__tarjeta--ancha animar-aparicion">
          <header className="pagina-autenticacion__encabezado">
            <h2 className="pagina-autenticacion__titulo">Crear cuenta</h2>
            <p className="pagina-autenticacion__subtitulo">
              Regístrate para comprar pasajes y guardar tus tickets electrónicos.
            </p>
          </header>

          <div className="pagina-autenticacion__social">
            <BotonGoogle alCredencial={manejarGoogle} alError={setErrorGeneral} deshabilitado={cargando} />
          </div>

          <div className="divisor-o pagina-autenticacion__divisor">
            <span>o regístrate con tu correo</span>
          </div>

          <form className="pagina-autenticacion__formulario" onSubmit={manejarEnvio}>
            <div className="pagina-autenticacion__fila">
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

            <div className="pagina-autenticacion__fila">
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

            <div className="pagina-autenticacion__acciones">
              <BotonPrincipal tipo="submit" deshabilitado={cargando} cargando={cargando} ancho="100%">
                {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
              </BotonPrincipal>
            </div>
          </form>

          <p className="pagina-autenticacion__pie">
            ¿Ya tienes una cuenta?{' '}
            <NavLink to="/iniciar-sesion" className="pagina-autenticacion__enlace">
              Iniciar sesión
            </NavLink>
          </p>
        </div>
      </div>
    </section>
  )
}
