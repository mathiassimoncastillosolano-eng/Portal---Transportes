import { NavLink, Outlet } from 'react-router-dom'
import { TarjetaPerfil } from '../componentes/perfil/TarjetaPerfil'
import { useAutenticacion } from '../hooks/useAutenticacion'
import './layoutPerfil.css'

const PESTANAS = [
  { ruta: '/perfil', etiqueta: 'Resumen' },
  { ruta: '/perfil/pasajes', etiqueta: 'Mis pasajes' },
  { ruta: '/perfil/historial', etiqueta: 'Historial de viajes' },
]

export function LayoutPerfil() {
  const { usuario } = useAutenticacion()

  return (
    <section className="seccion contenedor layout-perfil">
      <TarjetaPerfil usuario={usuario} />

      <nav className="layout-perfil__pestanas" aria-label="Secciones del perfil">
        {PESTANAS.map((pestana) => (
          <NavLink
            key={pestana.ruta}
            to={pestana.ruta}
            end={pestana.ruta === '/perfil'}
            className={({ isActive }) =>
              `layout-perfil__pestana ${isActive ? 'layout-perfil__pestana--activa' : ''}`
            }
          >
            {pestana.etiqueta}
          </NavLink>
        ))}
      </nav>

      <div className="layout-perfil__contenido">
        <Outlet />
      </div>
    </section>
  )
}
