import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { obtenerResumenPerfil } from '../../servicios/comprasServicio'
import './paginaPerfil.css'

const ICONOS = {
  pasajes: <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Zm7-2v12" />,
  viajes: <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  tickets: <path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2V4Zm4 5h6m-6 4h4" />,
}

function Icono({ nombre }) {
  return (
    <svg className="pagina-perfil__icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONOS[nombre]}
    </svg>
  )
}

export function PaginaPerfil() {
  const { usuario } = useAutenticacion()
  const [resumen, setResumen] = useState(null)
  const [estado, setEstado] = useState('cargando')
  const [intentos, setIntentos] = useState(0)

  useEffect(() => {
    let cancelado = false
    setEstado('cargando')
    obtenerResumenPerfil()
      .then((datos) => {
        if (cancelado) return
        setResumen(datos)
        setEstado('listo')
      })
      .catch(() => {
        if (!cancelado) setEstado('error')
      })
    return () => { cancelado = true }
  }, [usuario?.id, intentos])

  const cargando = estado === 'cargando'
  const valor = (campo) => (estado === 'listo' ? resumen[campo] : '—')
  const sinCompras = estado === 'listo' && resumen.pasajes === 0 && resumen.comprasVigentes === 0
  const vigentes = estado === 'listo' ? resumen.comprasVigentes : 0

  const indicadores = [
    { id: 'pasajes', etiqueta: 'Pasajes en tu cuenta', campo: 'pasajes' },
    { id: 'viajes', etiqueta: 'Viajes completados', campo: 'viajesCompletados' },
    { id: 'tickets', etiqueta: 'Tickets electrónicos', campo: 'tickets' },
  ]

  return (
    <div className="pagina-perfil" aria-busy={cargando}>
      <div className="pagina-perfil__estadisticas">
        {indicadores.map(({ id, etiqueta, campo }) => (
          <div key={id} className="pagina-perfil__estadistica">
            <Icono nombre={id} />
            <p className="pagina-perfil__numero">{valor(campo)}</p>
            <p className="pagina-perfil__etiqueta">{etiqueta}</p>
          </div>
        ))}
      </div>

      {estado === 'error' && (
        <p className="pagina-perfil__aviso pagina-perfil__aviso--error" role="alert">
          No pudimos cargar tu resumen.{' '}
          <button type="button" className="pagina-perfil__reintentar" onClick={() => setIntentos((n) => n + 1)}>
            Reintentar
          </button>
        </p>
      )}

      {sinCompras && (
        <div className="pagina-perfil__vacio">
          <p className="pagina-perfil__vacio-titulo">Todavía no tienes compras</p>
          <p>Cuando compres un pasaje, aquí verás tus pasajes, viajes y tickets.</p>
          <NavLink to="/" className="pagina-perfil__vacio-accion">Buscar un pasaje</NavLink>
        </div>
      )}

      <div className="pagina-perfil__accesos">
        <NavLink to="/perfil/pasajes" className="pagina-perfil__acceso">
          <span className="pagina-perfil__acceso-titulo">Mis pasajes y tickets</span>
          <span className="pagina-perfil__acceso-texto">
            {vigentes > 0
              ? `Tienes ${vigentes} ${vigentes === 1 ? 'compra vigente' : 'compras vigentes'}. Consulta tus boletos y asientos.`
              : 'Consulta tus compras, boletos y asientos.'}
          </span>
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
