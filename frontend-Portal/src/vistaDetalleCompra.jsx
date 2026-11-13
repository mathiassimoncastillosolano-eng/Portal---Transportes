import React from 'react'
import { createRoot } from 'react-dom/client'
import { TarjetaTicket } from './componentes/perfil/TarjetaTicket'
import { descargarPdfCompra } from './servicios/pdfBoleto'
import { compraEjemplo } from './vistaDatosEjemplo'
import './estilos/globales.css'
import './paginas/perfil/paginaMisPasajes.css'

function VistaDetalleCompra() {
  return (
    <main className="seccion contenedor pagina-mis-pasajes">
      <div className="pagina-mis-pasajes__detalle">
        <a className="pagina-mis-pasajes__volver" href="/vista-detalle-compra-cambiado.html">Ver cómo quedaría después del cambio →</a>
        <TarjetaTicket
          compra={compraEjemplo}
          onDescargar={() => descargarPdfCompra(compraEjemplo)}
          accionBoleto={(boleto) => (
            <a className="pagina-mis-pasajes__postergar" href={`/vista-cambio-fecha.html?boleto=${boleto.idPasaje}`}>
              Cambiar viaje
            </a>
          )}
        />
      </div>
    </main>
  )
}

createRoot(document.getElementById('raiz')).render(<VistaDetalleCompra />)
