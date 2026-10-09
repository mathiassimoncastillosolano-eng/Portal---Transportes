import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { listarBoletosDelUsuario } from '../../servicios/boletosServicio'
import { comprasVigentes } from '../../utilidades/pasajesVista'
import { TarjetaPasaje } from '../../componentes/perfil/TarjetaPasaje'
import { TarjetaTicket } from '../../componentes/perfil/TarjetaTicket'
import { PanelAsincrono } from '../../componentes/carga'
import './paginaMisPasajes.css'

export function PaginaMisPasajes() {
  const { usuario } = useAutenticacion()
  const ubicacion = useLocation()
  const codigoReciente = ubicacion.state?.pasajeReciente
  const [boletos, setBoletos] = useState([])
  const [fuente, setFuente] = useState(null)
  const [estado, setEstado] = useState('cargando')
  const [error, setError] = useState('')
  const [intentos, setIntentos] = useState(0)
  const [compraSeleccionada, setCompraSeleccionada] = useState(null)
  const [descargando, setDescargando] = useState(false)
  const [errorPdf, setErrorPdf] = useState('')

  useEffect(() => {
    let cancelado = false
    setEstado('cargando')
    setError('')
    listarBoletosDelUsuario()
      .then((respuesta) => {
        if (cancelado) return
        if (!Array.isArray(respuesta.boletos)) throw new Error('La respuesta de boletos no es válida.')
        setBoletos(respuesta.boletos)
        setFuente(respuesta.fuente)
        setEstado('listo')
      })
      .catch((fallo) => {
        if (cancelado) return
        setError(fallo.message || 'No se pudieron cargar tus pasajes.')
        setEstado('error')
      })
    return () => { cancelado = true }
  }, [usuario?.id, intentos])

  const compras = comprasVigentes(boletos)
  const seleccionada = compras.find((compra) => compra.id === compraSeleccionada)

  async function descargarPdf() {
    if (!seleccionada || fuente !== 'demostracion') return
    setDescargando(true)
    setErrorPdf('')
    try {
      const { descargarPdfCompraDemo } = await import('../../servicios/pdfCompraDemo')
      await descargarPdfCompraDemo(seleccionada)
    } catch {
      setErrorPdf('No se pudo preparar el PDF. Inténtalo nuevamente.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <section className="pagina-mis-pasajes">
      <div className="pagina-mis-pasajes__intro">
        <div><p className="pagina-mis-pasajes__eyebrow">TU PRÓXIMO VIAJE</p><h1>Mis pasajes</h1>
          <p>Consulta tus compras y los asientos incluidos en cada una.</p></div>
        {estado === 'listo' && compras.length > 0 && <span className="pagina-mis-pasajes__contador">{compras.length} {compras.length === 1 ? 'compra vigente' : 'compras vigentes'}</span>}
      </div>
      {fuente === 'demostracion' && estado === 'listo' &&
        <p className="pagina-mis-pasajes__aviso" role="status">Vista de demostración · Estos datos no provienen de la base de datos.</p>}
      {codigoReciente && estado === 'listo' && compras.some((compra) => compra.boletos.some((b) => b.codigo === codigoReciente)) &&
        <p className="pagina-mis-pasajes__confirmacion">Tu compra ya aparece entre los pasajes vigentes.</p>}
      <PanelAsincrono
        variante="generico"
        mensaje="Consultando tus pasajes"
        mensajeListo="Pasajes listos"
        cargando={estado === 'cargando'}
        error={estado === 'error' ? error : null}
        vacio={fuente !== 'pendiente' && compras.length === 0}
        alReintentar={() => setIntentos((n) => n + 1)}
        estadoError={{ titulo: 'No pudimos cargar tus pasajes' }}
        estadoVacio={{
          titulo: 'No tienes pasajes vigentes',
          texto: 'Aquí aparecerán tus próximas compras confirmadas.',
        }}
      >
        {() => fuente === 'pendiente' ? (
          <p className="pagina-mis-pasajes__vacio">La consulta de compras estará disponible cuando se integre el servicio del equipo backend.</p>
        ) : seleccionada ? (
          <div className="pagina-mis-pasajes__detalle">
            <button type="button" className="pagina-mis-pasajes__volver" onClick={() => { setCompraSeleccionada(null); setErrorPdf('') }}>← Volver a mis pasajes</button>
            <TarjetaTicket compra={seleccionada} onDescargar={descargarPdf} descargando={descargando} errorPdf={errorPdf} demostracion={fuente === 'demostracion'} />
          </div>
        ) : (
          <div className="pagina-mis-pasajes__lista">
            {compras.map((compra) => <TarjetaPasaje key={compra.id} compra={compra} onVerDetalle={() => setCompraSeleccionada(compra.id)} />)}
          </div>
        )}
      </PanelAsincrono>
    </section>
  )
}
