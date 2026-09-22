import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { obtenerPasajesDeUsuario } from '../../servicios/viajesServicio'
import { construirTicketDesdePasaje } from '../../datos/tickets'
import { TarjetaPasaje } from '../../componentes/perfil/TarjetaPasaje'
import { TarjetaTicket } from '../../componentes/perfil/TarjetaTicket'
import './paginaMisPasajes.css'

export function PaginaMisPasajes() {
  const { usuario } = useAutenticacion()
  const [pasajes, setPasajes] = useState([])
  const [vista, setVista] = useState('pasajes')
  const ubicacion = useLocation()
  const codigoReciente = ubicacion.state?.pasajeReciente

  useEffect(() => {
    setPasajes(obtenerPasajesDeUsuario(usuario.id))
  }, [usuario.id])

  const pasajesVigentes = pasajes.filter((pasaje) => pasaje.estado !== 'completado')
  const nombrePasajero = `${usuario.nombres} ${usuario.apellidos}`

  return (
    <div className="pagina-mis-pasajes">
      {codigoReciente && (
        <p className="pagina-mis-pasajes__confirmacion">
          ¡Compra confirmada! Tu pasaje {codigoReciente} ya está disponible como ticket electrónico.
        </p>
      )}

      <div className="pagina-mis-pasajes__conmutador">
        <button
          type="button"
          className={`pagina-mis-pasajes__opcion ${vista === 'pasajes' ? 'pagina-mis-pasajes__opcion--activa' : ''}`}
          onClick={() => setVista('pasajes')}
        >
          Mis pasajes
        </button>
        <button
          type="button"
          className={`pagina-mis-pasajes__opcion ${vista === 'tickets' ? 'pagina-mis-pasajes__opcion--activa' : ''}`}
          onClick={() => setVista('tickets')}
        >
          Mis tickets
        </button>
      </div>

      {pasajesVigentes.length === 0 ? (
        <p className="pagina-mis-pasajes__vacio">Todavía no tienes pasajes vigentes. Busca tu próximo viaje desde el inicio.</p>
      ) : vista === 'pasajes' ? (
        <div className="pagina-mis-pasajes__lista">
          {pasajesVigentes.map((pasaje) => (
            <TarjetaPasaje key={pasaje.codigo} pasaje={pasaje} />
          ))}
        </div>
      ) : (
        <div className="pagina-mis-pasajes__lista">
          {pasajesVigentes.map((pasaje) => (
            <TarjetaTicket key={pasaje.codigo} ticket={construirTicketDesdePasaje(pasaje, nombrePasajero)} />
          ))}
        </div>
      )}
    </div>
  )
}
