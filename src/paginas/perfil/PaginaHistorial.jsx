import { useEffect, useState } from 'react'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { obtenerPasajesDeUsuario } from '../../servicios/viajesServicio'
import { EstadoDisponibilidad } from '../../componentes/comunes/EstadoDisponibilidad'
import { formatearFechaCorta, formatearPrecio } from '../../utilidades/formato'
import './paginaHistorial.css'

export function PaginaHistorial() {
  const { usuario } = useAutenticacion()
  const [pasajes, setPasajes] = useState([])

  useEffect(() => {
    setPasajes(obtenerPasajesDeUsuario(usuario.id))
  }, [usuario.id])

  const historial = pasajes.filter((pasaje) => pasaje.estado === 'completado' || pasaje.estado === 'cancelado')

  if (historial.length === 0) {
    return <p className="pagina-historial__vacio">Todavía no registras viajes completados.</p>
  }

  return (
    <div className="pagina-historial">
      {historial.map((pasaje) => (
        <article key={pasaje.codigo} className="pagina-historial__fila">
          <div className="pagina-historial__fecha">
            <span className="pagina-historial__dia">{formatearFechaCorta(pasaje.fecha)}</span>
          </div>
          <div className="pagina-historial__ruta">
            <span className="pagina-historial__ciudad">{pasaje.origen}</span>
            <span className="pagina-historial__flecha">→</span>
            <span className="pagina-historial__ciudad">{pasaje.destino}</span>
          </div>
          <span className="pagina-historial__empresa">{pasaje.empresa}</span>
          <span className="pagina-historial__servicio">{pasaje.tipoBus}</span>
          <span className="pagina-historial__precio">{formatearPrecio(pasaje.precio)}</span>
          <EstadoDisponibilidad estado={pasaje.estado} />
        </article>
      ))}
    </div>
  )
}
