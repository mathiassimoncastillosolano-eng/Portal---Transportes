import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { obtenerPasajesDeUsuario } from '../../servicios/viajesServicio'
import { formatearFechaCorta } from '../../utilidades/formato'
import './paginaPerfil.css'

export function PaginaPerfil() {
  const { usuario } = useAutenticacion()
  const [pasajes, setPasajes] = useState([])

  useEffect(() => {
    setPasajes(obtenerPasajesDeUsuario(usuario.id))
  }, [usuario.id])

  const proximoViaje = pasajes.find((pasaje) => pasaje.estado === 'confirmado')
  const viajesCompletados = pasajes.filter((pasaje) => pasaje.estado === 'completado').length

  return (
    <div className="pagina-perfil">
      <div className="pagina-perfil__estadisticas">
        <div className="pagina-perfil__estadistica">
          <p className="pagina-perfil__numero">{pasajes.length}</p>
          <p className="pagina-perfil__etiqueta">Pasajes en tu cuenta</p>
        </div>
        <div className="pagina-perfil__estadistica">
          <p className="pagina-perfil__numero">{viajesCompletados}</p>
          <p className="pagina-perfil__etiqueta">Viajes completados</p>
        </div>
        <div className="pagina-perfil__estadistica">
          <p className="pagina-perfil__numero">{proximoViaje ? formatearFechaCorta(proximoViaje.fecha) : '—'}</p>
          <p className="pagina-perfil__etiqueta">Próximo viaje</p>
        </div>
      </div>

      {proximoViaje && (
        <div className="pagina-perfil__proximo">
          <div>
            <p className="pagina-perfil__proximo-etiqueta">Tu próximo viaje</p>
            <h3 className="pagina-perfil__proximo-ruta">
              {proximoViaje.origen} → {proximoViaje.destino}
            </h3>
            <p className="pagina-perfil__proximo-detalle">
              {formatearFechaCorta(proximoViaje.fecha)} · {proximoViaje.hora} · {proximoViaje.empresa}
            </p>
          </div>
          <NavLink to="/perfil/pasajes" className="pagina-perfil__proximo-enlace">
            Ver ticket
          </NavLink>
        </div>
      )}

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
