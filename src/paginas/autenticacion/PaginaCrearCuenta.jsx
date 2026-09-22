import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { CampoTexto } from '../../componentes/comunes/CampoTexto'
import { BotonPrincipal } from '../../componentes/comunes/BotonPrincipal'
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

const ICONO_CORREO = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Z" stroke="currentColor" strokeWidth="1.6" />
    <path d="m4 6.5 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ICONO_TELEFONO = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <path d="M6.6 10.5c1.2 2.4 3.1 4.3 5.5 5.5l1.9-1.9c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1V19c0 .6-.4 1-1 1C10.6 20 4 13.4 4 5.5c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.4 0 .8-.2 1L6.6 10.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
)

const ICONO_CANDADO = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="10.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

export function PaginaCrearCuenta() {
  const { registrarUsuario } = useAutenticacion()
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

  return (
    <section className="pagina-autenticacion">
      <div className="pagina-autenticacion__marca">
        <div className="pagina-autenticacion__marca-logo">
          <span className="pagina-autenticacion__marca-isotipo">RL</span>
          RutaLibre
        </div>

        <div className="pagina-autenticacion__marca-cuerpo">
          <h1 className="pagina-autenticacion__marca-titulo">Únete a RutaLibre</h1>
          <p className="pagina-autenticacion__marca-texto">
            Crea tu cuenta y empieza a reservar pasajes en minutos, con
            tickets electrónicos y todo tu historial de viajes en un solo lugar.
          </p>
        </div>

        <ul className="pagina-autenticacion__marca-lista">
          <li className="pagina-autenticacion__marca-item">
            <span className="pagina-autenticacion__marca-item-icono">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17l9-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            Registro rápido, sin complicaciones
          </li>
          <li className="pagina-autenticacion__marca-item">
            <span className="pagina-autenticacion__marca-item-icono">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17l9-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            Cinco niveles de servicio a tu elección
          </li>
          <li className="pagina-autenticacion__marca-item">
            <span className="pagina-autenticacion__marca-item-icono">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17l9-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            Atención al cliente las 24 horas
          </li>
        </ul>
      </div>

      <div className="pagina-autenticacion__panel">
        <div className="pagina-autenticacion__tarjeta pagina-autenticacion__tarjeta--ancha animar-aparicion">
          <h2 className="pagina-autenticacion__titulo">Crear cuenta</h2>
          <p className="pagina-autenticacion__subtitulo">
            Regístrate para comprar pasajes y guardar tus tickets electrónicos.
          </p>

          <form className="pagina-autenticacion__formulario" onSubmit={manejarEnvio}>
            <div className="pagina-autenticacion__fila">
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
              icono={ICONO_CORREO}
            />

            <CampoTexto
              etiqueta="Teléfono (opcional)"
              tipo="tel"
              valor={valores.telefono}
              alCambiar={(valor) => actualizarCampo('telefono', valor)}
              error={errores.telefono}
              icono={ICONO_TELEFONO}
            />

            <div className="pagina-autenticacion__fila">
              <CampoTexto
                etiqueta="Contraseña"
                tipo="password"
                valor={valores.contrasena}
                alCambiar={(valor) => actualizarCampo('contrasena', valor)}
                error={errores.contrasena}
                requerido
                autoComplete="new-password"
                icono={ICONO_CANDADO}
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
              />
            </div>

            {errorGeneral && <p className="pagina-autenticacion__error">{errorGeneral}</p>}

            <BotonPrincipal tipo="submit" deshabilitado={cargando} ancho="100%">
              {cargando ? 'Creando cuenta…' : 'Crear cuenta'}
            </BotonPrincipal>
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
