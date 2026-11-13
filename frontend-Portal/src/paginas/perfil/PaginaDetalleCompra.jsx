import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { adaptarBoletoReal, puedeIniciarPostergacion } from '../../utilidades/postergacion'
import { obtenerCompra } from '../../servicios/comprasServicio'
import { vistaCambioSimulado } from '../../utilidades/vistaCambioSimulado'
import { TarjetaTicket } from '../../componentes/perfil/TarjetaTicket'
import { PanelAsincrono } from '../../componentes/carga'
import './paginaMisPasajes.css'

/** /perfil/pasajes/:idVenta — siempre consulta al backend, que solo entrega compras del usuario autenticado. */
export function PaginaDetalleCompra() {
  const { idVenta } = useParams()
  const { state } = useLocation()
  const { usuario } = useAutenticacion()
  const [compra, setCompra] = useState(null)
  const [estado, setEstado] = useState('cargando')
  const [error, setError] = useState('')
  const [intentos, setIntentos] = useState(0)
  const [descargando, setDescargando] = useState(false)
  const [errorPdf, setErrorPdf] = useState('')
  const compraVisible = vistaCambioSimulado(compra, state?.cambioSimulado)
  const vistaPrevia = compraVisible !== compra

  useEffect(() => {
    let cancelado = false
    setEstado('cargando')
    setError('')
    setCompra(null)
    obtenerCompra(idVenta)
      .then((respuesta) => {
        if (cancelado) return
        setCompra(respuesta)
        setEstado('listo')
      })
      .catch((fallo) => {
        if (cancelado) return
        setError(fallo.message || 'No se pudo cargar la compra.')
        setEstado('error')
      })
    return () => { cancelado = true }
  }, [idVenta, intentos])

  async function descargarPdf() {
    if (!compra?.documentoDisponible) return
    setDescargando(true)
    setErrorPdf('')
    try {
      if (vistaPrevia) {
        const { descargarPdfCompraMock } = await import('../../servicios/pdfCompraMock')
        await descargarPdfCompraMock(compraVisible)
      } else {
        const { descargarPdfCompra } = await import('../../servicios/pdfBoleto')
        await descargarPdfCompra(compra)
      }
    } catch {
      setErrorPdf('No se pudo preparar el PDF. Inténtalo nuevamente.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <section className="pagina-mis-pasajes">
      <div className="pagina-mis-pasajes__detalle">
        <Link to="/perfil/pasajes" className="pagina-mis-pasajes__volver">← Volver a mis pasajes</Link>
        <PanelAsincrono
          variante="generico"
          mensaje="Cargando el detalle de tu compra"
          mensajeListo="Detalle listo"
          cargando={estado === 'cargando'}
          error={estado === 'error' ? error : null}
          alReintentar={() => setIntentos((n) => n + 1)}
          estadoError={{ titulo: 'No pudimos abrir esta compra' }}
        >
          {() => compra && (
            <>
            {vistaPrevia && (
              <p className="tarjeta-ticket__alerta" role="note">
                Vista previa simulada: la compra y el pago registrados no cambiaron. Vuelve a Mis pasajes para consultar la compra original.
              </p>
            )}
            <TarjetaTicket
              compra={compraVisible}
              onDescargar={descargarPdf}
              descargando={descargando}
              errorPdf={errorPdf}
              accionBoleto={(boleto) => !vistaPrevia && puedeIniciarPostergacion(compra) && (
                <Link
                  className="pagina-mis-pasajes__postergar"
                  to={`/postergar/${boleto.idPasaje}`}
                  state={{ pasaje: adaptarBoletoReal(compra, boleto, usuario?.id) }}
                >
                  Cambiar viaje
                </Link>
              )}
            />
            </>
          )}
        </PanelAsincrono>
      </div>
    </section>
  )
}
