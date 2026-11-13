import React from 'react'
import { createRoot } from 'react-dom/client'
import { EstadoDisponibilidad } from './componentes/comunes/EstadoDisponibilidad'
import { formatearFechaLarga, formatearPrecio } from './utilidades/formato'
import { cambioEjemplo, compraEjemplo } from './vistaDatosEjemplo'
import './estilos/globales.css'
import './componentes/perfil/tarjetaTicket.css'
import './paginas/perfil/paginaMisPasajes.css'
import './vistaDetalleCompraCambiado.css'

function Boleto({ boleto, indice }) {
  const cambiado = boleto.idPasaje === cambioEjemplo.idPasaje
  const viaje = cambiado ? cambioEjemplo : compraEjemplo

  return (
    <div className={`tarjeta-ticket__boleto detalle-cambiado__boleto${cambiado ? ' detalle-cambiado__boleto--cambiado' : ''}`}>
      <div className="detalle-cambiado__estado">
        <span>Boleto {indice + 1}</span>
        <strong>{cambiado ? 'Viaje cambiado' : 'Sin cambios'}</strong>
      </div>
      <div className="tarjeta-ticket__boleto-asiento">
        <small>Asiento vigente</small>
        <strong>{viaje.asiento ?? boleto.asiento}</strong>
      </div>
      <div className="tarjeta-ticket__boleto-pasajero">
        <small>Pasajero</small>
        <strong>{boleto.pasajero}</strong>
        <span className="tarjeta-ticket__documento">{boleto.documento}</span>
      </div>
      <div className="tarjeta-ticket__boleto-codigo">
        <small>N.º de boleto</small>
        <strong className="tarjeta-ticket__codigo">{boleto.numeroBoleto}</strong>
      </div>
      <strong className="tarjeta-ticket__boleto-precio">{formatearPrecio(boleto.precio, compraEjemplo.moneda)}</strong>
      <div className="detalle-cambiado__itinerario">
        <div><small>Viaje vigente</small><strong>{viaje.origen} → {viaje.destino}</strong></div>
        <div><small>Salida</small><strong>{formatearFechaLarga(viaje.fechaSalida)} · {viaje.horaSalida}</strong></div>
        <div><small>Servicio</small><strong>RutaLibre · {viaje.servicio ?? viaje.tipoBus}</strong></div>
      </div>
      {cambiado && (
        <p className="detalle-cambiado__anterior">
          Antes: {compraEjemplo.origen} → {compraEjemplo.destino} · {formatearFechaLarga(compraEjemplo.fechaSalida)} · {compraEjemplo.horaSalida} · asiento {boleto.asiento}.
          {' '}Diferencia pagada por este cambio: {formatearPrecio(cambioEjemplo.diferenciaPagada, compraEjemplo.moneda)}.
        </p>
      )}
    </div>
  )
}

function VistaDetalleCompraCambiado() {
  const totalPagado = compraEjemplo.total + cambioEjemplo.diferenciaPagada

  return (
    <main className="seccion contenedor pagina-mis-pasajes">
      <div className="pagina-mis-pasajes__detalle">
        <a className="pagina-mis-pasajes__volver" href="/vista-detalle-compra.html">← Ver compra antes del cambio</a>
        <p className="detalle-cambiado__aviso">Vista de ejemplo: este cambio aún no se registra en la base de datos.</p>
        <article className="tarjeta-ticket">
          <div className="tarjeta-ticket__franja">
            <span className="tarjeta-ticket__marca"><span className="tarjeta-ticket__isotipo">RL</span> RutaLibre</span>
            <EstadoDisponibilidad estado="confirmado" etiqueta="Compra confirmada" />
          </div>
          <div className="tarjeta-ticket__cuerpo">
            <header className="tarjeta-ticket__encabezado">
              <h1 className="tarjeta-ticket__sobrelinea">DETALLE DE LA COMPRA</h1>
              <p className="tarjeta-ticket__codigo-compra">{compraEjemplo.codigoCompra}</p>
            </header>
            <section className="detalle-cambiado__original" aria-label="Viaje de la compra original">
              <span>VIAJE DE LA COMPRA ORIGINAL</span>
              <strong>{compraEjemplo.origen} → {compraEjemplo.destino}</strong>
              <p>{formatearFechaLarga(compraEjemplo.fechaSalida)} · {compraEjemplo.horaSalida} · RutaLibre · {compraEjemplo.tipoBus}</p>
            </section>
            <section className="tarjeta-ticket__boletos" aria-label="Boletos de esta compra">
              <h2>Boletos de esta compra <span>{compraEjemplo.boletos.length}</span></h2>
              {compraEjemplo.boletos.map((boleto, indice) => <Boleto key={boleto.idPasaje} boleto={boleto} indice={indice} />)}
            </section>
            <dl className="detalle-cambiado__totales">
              <div><dt>Compra original</dt><dd>{formatearPrecio(compraEjemplo.total, compraEjemplo.moneda)}</dd></div>
              <div><dt>Pago adicional del boleto 2</dt><dd>{formatearPrecio(cambioEjemplo.diferenciaPagada, compraEjemplo.moneda)}</dd></div>
              <div className="detalle-cambiado__total-final"><dt>Total pagado</dt><dd>{formatearPrecio(totalPagado, compraEjemplo.moneda)}</dd></div>
            </dl>
            <div className="detalle-cambiado__acciones">
              <a href="/demo/pdf/vista-cambio-pasaje.pdf" target="_blank" rel="noreferrer">Ver PDF actualizado ↗</a>
              <a href="/demo/pdf/vista-cambio-pasaje.pdf" download>Descargar PDF de ejemplo</a>
            </div>
          </div>
        </article>
      </div>
    </main>
  )
}

createRoot(document.getElementById('raiz')).render(<VistaDetalleCompraCambiado />)
