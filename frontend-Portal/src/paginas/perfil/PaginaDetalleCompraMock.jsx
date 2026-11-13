import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { obtenerCompraDemo } from '../../mock/postergacion/pasajes'
import { TarjetaTicket } from '../../componentes/perfil/TarjetaTicket'
import { descargarPdfDocumentoMock, verPdfDocumentoMock } from '../../servicios/pdfCompraMock'
import './paginaMisPasajes.css'

/** Compra de tres boletos para recorrer el cambio simulado desde la interfaz real. */
export function PaginaDetalleCompraMock() {
  const { usuario } = useAutenticacion()
  const idCliente = usuario?.id ?? 'cliente-mock'
  const compra = obtenerCompraDemo(idCliente)
  const compraMock = { ...compra, esMock: true }
  const [descargando, setDescargando] = useState(false)
  const [errorPdf, setErrorPdf] = useState('')

  async function descargarPdf(documento) {
    setDescargando(true)
    setErrorPdf('')
    try {
      await descargarPdfDocumentoMock(compraMock, documento)
    } catch {
      setErrorPdf('No se pudo preparar el PDF de prueba. Inténtalo nuevamente.')
    } finally {
      setDescargando(false)
    }
  }

  async function verPdf(documento) {
    setDescargando(true)
    setErrorPdf('')
    try {
      await verPdfDocumentoMock(compraMock, documento)
    } catch {
      setErrorPdf('No se pudo abrir el PDF de prueba. Inténtalo nuevamente.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <section className="pagina-mis-pasajes">
      <div className="pagina-mis-pasajes__detalle">
        <Link to="/perfil/pasajes" className="pagina-mis-pasajes__volver">← Volver a mis pasajes</Link>
        <p className="tarjeta-ticket__alerta" role="note">Compra de prueba: los cambios y pagos se simulan durante esta sesión local.</p>
        <TarjetaTicket
          compra={compraMock}
          onDescargar={descargarPdf}
          onVerPdf={verPdf}
          descargando={descargando}
          errorPdf={errorPdf}
          accionBoleto={(boleto) => (
            <Link className="pagina-mis-pasajes__postergar" to={`/postergar/${boleto.idPasaje}`}>
              Cambiar viaje
            </Link>
          )}
        />
      </div>
    </section>
  )
}
