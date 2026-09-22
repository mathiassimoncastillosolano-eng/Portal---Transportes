import { formatearFechaLarga, formatearPrecio } from '../../utilidades/formato'
import { EstadoDisponibilidad } from '../comunes/EstadoDisponibilidad'
import './tarjetaTicket.css'

function generarPatronQr(semilla) {
  const tamano = 7
  let valor = 0
  for (let i = 0; i < semilla.length; i += 1) {
    valor = (valor * 31 + semilla.charCodeAt(i)) % 100000
  }

  const celdas = []
  for (let fila = 0; fila < tamano; fila += 1) {
    for (let columna = 0; columna < tamano; columna += 1) {
      valor = (valor * 1103515245 + 12345) % 2147483648
      const activa = valor % 5 < 2
      const esquina =
        (fila < 2 && columna < 2) ||
        (fila < 2 && columna > tamano - 3) ||
        (fila > tamano - 3 && columna < 2)
      celdas.push(esquina || activa)
    }
  }
  return celdas
}

export function TarjetaTicket({ ticket }) {
  const celdasQr = generarPatronQr(ticket.qrSemilla)

  return (
    <article className="tarjeta-ticket">
      <div className="tarjeta-ticket__franja">
        <div className="tarjeta-ticket__marca">
          <span className="tarjeta-ticket__isotipo">RL</span>
          <span>RutaLibre</span>
        </div>
        <EstadoDisponibilidad estado={ticket.estado} />
      </div>

      <div className="tarjeta-ticket__cuerpo">
        <div className="tarjeta-ticket__ruta">
          <div>
            <p className="tarjeta-ticket__ciudad">{ticket.origen}</p>
            <p className="tarjeta-ticket__etiqueta">{formatearFechaLarga(ticket.fecha)}</p>
          </div>
          <span className="tarjeta-ticket__linea" aria-hidden="true" />
          <div className="tarjeta-ticket__ciudad-derecha">
            <p className="tarjeta-ticket__ciudad">{ticket.destino}</p>
            <p className="tarjeta-ticket__etiqueta">{ticket.hora}</p>
          </div>
        </div>

        <div className="tarjeta-ticket__separador">
          <span className="tarjeta-ticket__muesca tarjeta-ticket__muesca--izquierda" />
          <span className="tarjeta-ticket__punteado" />
          <span className="tarjeta-ticket__muesca tarjeta-ticket__muesca--derecha" />
        </div>

        <div className="tarjeta-ticket__pie">
          <div className="tarjeta-ticket__datos">
            <div className="tarjeta-ticket__dato">
              <p className="tarjeta-ticket__etiqueta">Pasajero</p>
              <p className="tarjeta-ticket__valor">{ticket.pasajero}</p>
            </div>
            <div className="tarjeta-ticket__dato">
              <p className="tarjeta-ticket__etiqueta">Asiento</p>
              <p className="tarjeta-ticket__valor">{ticket.asiento}</p>
            </div>
            <div className="tarjeta-ticket__dato">
              <p className="tarjeta-ticket__etiqueta">Servicio</p>
              <p className="tarjeta-ticket__valor">{ticket.tipoBus}</p>
            </div>
            <div className="tarjeta-ticket__dato">
              <p className="tarjeta-ticket__etiqueta">Código</p>
              <p className="tarjeta-ticket__valor tarjeta-ticket__valor--codigo">{ticket.codigo}</p>
            </div>
            <div className="tarjeta-ticket__dato">
              <p className="tarjeta-ticket__etiqueta">Precio</p>
              <p className="tarjeta-ticket__valor">{formatearPrecio(ticket.precio)}</p>
            </div>
          </div>

          <div className="tarjeta-ticket__qr" role="img" aria-label={`Código QR simulado del ticket ${ticket.codigo}`}>
            <svg viewBox="0 0 7 7" width="84" height="84">
              {celdasQr.map((activa, indice) =>
                activa ? (
                  <rect
                    key={indice}
                    x={indice % 7}
                    y={Math.floor(indice / 7)}
                    width="1"
                    height="1"
                    fill="var(--color-azul-900)"
                  />
                ) : null
              )}
            </svg>
          </div>
        </div>
      </div>
    </article>
  )
}
