import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { listarHistorial } from '../../servicios/comprasServicio'
import { EstadoDisponibilidad } from '../../componentes/comunes/EstadoDisponibilidad'
import { PanelAsincrono } from '../../componentes/carga'
import { formatearFechaCorta, formatearPrecio } from '../../utilidades/formato'
import { contarPorFiltro, estadoVisible, filtrarHistorial, FILTROS_HISTORIAL, textoAsientos } from '../../utilidades/pasajesVista'
import './paginaHistorial.css'

export function PaginaHistorial() {
  const { usuario } = useAutenticacion()
  const [compras, setCompras] = useState([])
  const [estado, setEstado] = useState('cargando')
  const [error, setError] = useState('')
  const [intentos, setIntentos] = useState(0)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => {
    let cancelado = false
    setEstado('cargando')
    setError('')
    listarHistorial()
      .then((respuesta) => {
        if (cancelado) return
        setCompras(respuesta)
        setEstado('listo')
      })
      .catch((fallo) => {
        if (cancelado) return
        setError(fallo.message || 'No se pudo cargar tu historial.')
        setEstado('error')
      })
    return () => { cancelado = true }
  }, [usuario?.id, intentos])

  const conteo = useMemo(() => contarPorFiltro(compras), [compras])
  const visibles = useMemo(() => filtrarHistorial(compras, filtro), [compras, filtro])

  return (
    <section className="pagina-historial">
      <PanelAsincrono
        variante="generico"
        mensaje="Consultando tu historial"
        mensajeListo="Historial listo"
        cargando={estado === 'cargando'}
        error={estado === 'error' ? error : null}
        vacio={estado === 'listo' && compras.length === 0}
        alReintentar={() => setIntentos((n) => n + 1)}
        estadoError={{ titulo: 'No pudimos cargar tu historial' }}
        estadoVacio={{
          titulo: 'Aún no tienes viajes en tu historial',
          texto: 'Aquí verás tus viajes realizados y las compras que ya no están vigentes.',
          accion: { texto: 'Buscar un pasaje', to: '/' },
        }}
      >
        {() => (
          <>
            <div className="pagina-historial__filtros" role="group" aria-label="Filtrar historial">
              {FILTROS_HISTORIAL.map(({ id, etiqueta }) => (
                <button
                  key={id}
                  type="button"
                  className={`pagina-historial__filtro${filtro === id ? ' pagina-historial__filtro--activo' : ''}`}
                  aria-pressed={filtro === id}
                  onClick={() => setFiltro(id)}
                >
                  {etiqueta} <span>{conteo[id]}</span>
                </button>
              ))}
            </div>

            {visibles.length === 0 ? (
              <p className="pagina-historial__vacio">No hay compras en esta categoría.</p>
            ) : (
              <ul className="pagina-historial__lista">
                {visibles.map((compra) => {
                  const estadoCompra = estadoVisible(compra)
                  return (
                    <li key={compra.idVenta} className="pagina-historial__fila">
                      <span className="pagina-historial__dia">
                        {compra.fechaSalida ? formatearFechaCorta(compra.fechaSalida) : 'Fecha por confirmar'}
                        {compra.horaSalida && <small>{compra.horaSalida}</small>}
                      </span>
                      <span className="pagina-historial__ruta">
                        <span className="pagina-historial__ciudad">{compra.origen ?? '—'}</span>
                        <span className="pagina-historial__flecha" aria-hidden="true">→</span>
                        <span className="pagina-historial__ciudad">{compra.destino ?? '—'}</span>
                      </span>
                      <span className="pagina-historial__servicio">
                        {compra.tipoBus ?? '—'}
                        <small>Asientos: {textoAsientos(compra) ?? '—'}</small>
                      </span>
                      <span className="pagina-historial__precio">{formatearPrecio(compra.total, compra.moneda)}</span>
                      <EstadoDisponibilidad estado={estadoCompra.clave} etiqueta={estadoCompra.etiqueta} />
                      <Link className="pagina-historial__detalle" to={`/perfil/pasajes/${compra.idVenta}`}>
                        Ver detalle<span className="pagina-historial__solo-lectores"> de la compra {compra.codigoCompra}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </PanelAsincrono>
    </section>
  )
}
