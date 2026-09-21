import { NavLink } from 'react-router-dom'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import './paginaPerfil.css'

export function PaginaPerfil() {
  const { usuario } = useAutenticacion()

  // Pasajes, viajes y tickets todavía no están implementados en el
  // sistema: el backend los devuelve fijos en cero dentro del perfil
  // (ver EstadisticasUsuarioResponse). Este es un valor temporal, no una
  // simulación de datos reales.
  const estadisticas = usuario?.estadisticas ?? { pasajes: 0, viajes: 0, tickets: 0 }

  return (
    <div className="pagina-perfil">
      <div className="pagina-perfil__estadisticas">
        <div className="pagina-perfil__estadistica">
          <p className="pagina-perfil__numero">{estadisticas.pasajes}</p>
          <p className="pagina-perfil__etiqueta">Pasajes en tu cuenta</p>
        </div>
        <div className="pagina-perfil__estadistica">
          <p className="pagina-perfil__numero">{estadisticas.viajes}</p>
          <p className="pagina-perfil__etiqueta">Viajes completados</p>
        </div>
        <div className="pagina-perfil__estadistica">
          <p className="pagina-perfil__numero">{estadisticas.tickets}</p>
          <p className="pagina-perfil__etiqueta">Tickets electrónicos</p>
        </div>
      </div>

      <p className="pagina-perfil__aviso">
        Todavía no tienes pasajes, viajes ni tickets registrados. Esta sección se
        activará cuando la compra de pasajes esté disponible.
      </p>

      <div className="pagina-perfil__accesos">
        <NavLink to="/perfil/pasajes" className="pagina-perfil__acceso">
          <span className="pagina-perfil__acceso-titulo">Mis pasajes y tickets</span>
          <span className="pagina-perfil__acceso-texto">Consulta tus tickets electrónicos y códigos QR de viaje.</span>
        </NavLink>
        <NavLink to="/perfil/historial" className="pagina-perfil__acceso">
          <span className="pagina-perfil__acceso-titulo">Historial de viajes</span>
          <span className="pagina-perfil__acceso-texto">Revisa los viajes que ya realizaste con nosotros.</span>
        </NavLink>
        <NavLink to="/" className="pagina-perfil__acceso">
          <span className="pagina-perfil__acceso-titulo">Buscar un nuevo pasaje</span>
          <span className="pagina-perfil__acceso-texto">Explora rutas y compra tu próximo viaje.</span>
        </NavLink>
      </div>
    </div>
  )
}
