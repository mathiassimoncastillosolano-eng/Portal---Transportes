import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { iniciales } from '../../utilidades/formato'
import { useClicFuera } from '../../hooks/useClicFuera'
import './barraNavegacion.css'

const ENLACES = [
  { ruta: '/', etiqueta: 'Inicio' },
  { ruta: '/destinos', etiqueta: 'Destinos' },
  { ruta: '/servicios', etiqueta: 'Servicios' },
  { ruta: '/ayuda', etiqueta: 'Ayuda' },
]

export function BarraNavegacion({ alAbrirInicioSesion }) {
  const { usuario, estaAutenticado, cerrarSesion } = useAutenticacion()
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false)
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false)
  const [conFondo, setConFondo] = useState(false)
  const referenciaPerfil = useRef(null)
  const navegar = useNavigate()
  const ubicacion = useLocation()

  useClicFuera(referenciaPerfil, () => setMenuPerfilAbierto(false))

  useEffect(() => {
    const alDesplazar = () => setConFondo(window.scrollY > 12)
    alDesplazar()
    window.addEventListener('scroll', alDesplazar)
    return () => window.removeEventListener('scroll', alDesplazar)
  }, [])

  function manejarCerrarSesion() {
    cerrarSesion()
    setMenuPerfilAbierto(false)
    navegar('/')
  }

  function manejarClicLogo(evento) {
    // Si ya estamos en el inicio, React Router no dispara una navegación
    // (misma ruta), así que el logo debe, en ese caso, regresar al scroll
    // inicial de la página de forma suave.
    if (ubicacion.pathname === '/') {
      evento.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <header className={`barra-navegacion ${conFondo ? 'barra-navegacion--con-fondo' : ''}`}>
      <div className="contenedor barra-navegacion__interior">
        <NavLink to="/" className="barra-navegacion__marca" onClick={manejarClicLogo}>
          <span className="barra-navegacion__isotipo">RL</span>
          <span className="barra-navegacion__nombre">RutaLibre</span>
        </NavLink>

        <nav className="barra-navegacion__enlaces" aria-label="Navegación principal">
          {ENLACES.map((enlace) => (
            <NavLink
              key={enlace.ruta}
              to={enlace.ruta}
              className={({ isActive }) =>
                `barra-navegacion__enlace ${isActive ? 'barra-navegacion__enlace--activo' : ''}`
              }
              end={enlace.ruta === '/'}
            >
              {enlace.etiqueta}
            </NavLink>
          ))}
        </nav>

        <div className="barra-navegacion__acciones">
          {estaAutenticado ? (
            <div className="barra-navegacion__perfil" ref={referenciaPerfil}>
              <button
                type="button"
                className="barra-navegacion__boton-perfil"
                onClick={() => setMenuPerfilAbierto((valor) => !valor)}
              >
                <span className="barra-navegacion__avatar">
                  {iniciales(usuario.nombres, usuario.apellidos)}
                </span>
                <span className="barra-navegacion__nombre-perfil">Mi perfil</span>
              </button>

              {menuPerfilAbierto && (
                <div className="barra-navegacion__menu-perfil animar-aparicion">
                  <p className="barra-navegacion__menu-nombre">
                    {usuario.nombres} {usuario.apellidos}
                  </p>
                  <p className="barra-navegacion__menu-correo">{usuario.correo}</p>
                  <hr className="barra-navegacion__menu-separador" />
                  <NavLink to="/perfil" className="barra-navegacion__menu-item" onClick={() => setMenuPerfilAbierto(false)}>
                    Mi perfil
                  </NavLink>
                  <NavLink to="/perfil/pasajes" className="barra-navegacion__menu-item" onClick={() => setMenuPerfilAbierto(false)}>
                    Mis pasajes
                  </NavLink>
                  <NavLink to="/perfil/historial" className="barra-navegacion__menu-item" onClick={() => setMenuPerfilAbierto(false)}>
                    Historial de viajes
                  </NavLink>
                  <button type="button" className="barra-navegacion__menu-item barra-navegacion__menu-item--salir" onClick={manejarCerrarSesion}>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="barra-navegacion__boton-ingreso" onClick={alAbrirInicioSesion}>
              Iniciar sesión
            </button>
          )}

          <button
            type="button"
            className="barra-navegacion__hamburguesa"
            aria-label="Abrir menú"
            aria-expanded={menuMovilAbierto}
            onClick={() => setMenuMovilAbierto((valor) => !valor)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {menuMovilAbierto && (
        <nav className="barra-navegacion__menu-movil animar-aparicion" aria-label="Navegación móvil">
          {ENLACES.map((enlace) => (
            <NavLink
              key={enlace.ruta}
              to={enlace.ruta}
              className="barra-navegacion__enlace-movil"
              onClick={() => setMenuMovilAbierto(false)}
              end={enlace.ruta === '/'}
            >
              {enlace.etiqueta}
            </NavLink>
          ))}
          {estaAutenticado ? (
            <>
              <NavLink to="/perfil" className="barra-navegacion__enlace-movil" onClick={() => setMenuMovilAbierto(false)}>
                Mi perfil
              </NavLink>
              <button type="button" className="barra-navegacion__enlace-movil barra-navegacion__enlace-movil--boton" onClick={manejarCerrarSesion}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <button
              type="button"
              className="barra-navegacion__enlace-movil barra-navegacion__enlace-movil--boton"
              onClick={() => {
                setMenuMovilAbierto(false)
                alAbrirInicioSesion()
              }}
            >
              Iniciar sesión
            </button>
          )}
        </nav>
      )}
    </header>
  )
}
