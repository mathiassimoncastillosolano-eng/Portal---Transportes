import { EstadoDisponibilidad } from '../comunes/EstadoDisponibilidad'
import { formatearFechaCorta, formatearPrecio } from '../../utilidades/formato'
import './tarjetaPasaje.css'

export function TarjetaPasaje({ pasaje }) {
  return (
    <article className="tarjeta-pasaje">
      <div className="tarjeta-pasaje__ruta">
        <div>
          <p className="tarjeta-pasaje__ciudad">{pasaje.origen}</p>
          <p className="tarjeta-pasaje__etiqueta">Origen</p>
        </div>
        <span className="tarjeta-pasaje__flecha">→</span>
        <div>
          <p className="tarjeta-pasaje__ciudad">{pasaje.destino}</p>
          <p className="tarjeta-pasaje__etiqueta">Destino</p>
        </div>
      </div>

      <div className="tarjeta-pasaje__info">
        <div>
          <p className="tarjeta-pasaje__etiqueta">Fecha y hora</p>
          <p className="tarjeta-pasaje__valor">{formatearFechaCorta(pasaje.fecha)} · {pasaje.hora}</p>
        </div>
        <div>
          <p className="tarjeta-pasaje__etiqueta">Empresa</p>
          <p className="tarjeta-pasaje__valor">{pasaje.empresa}</p>
        </div>
        <div>
          <p className="tarjeta-pasaje__etiqueta">Servicio</p>
          <p className="tarjeta-pasaje__valor">{pasaje.tipoBus} · Asiento {pasaje.asiento}</p>
        </div>
      </div>

      <div className="tarjeta-pasaje__pie">
        <span className="tarjeta-pasaje__codigo">{pasaje.codigo}</span>
        <span className="tarjeta-pasaje__precio">{formatearPrecio(pasaje.precio)}</span>
        <EstadoDisponibilidad estado={pasaje.estado} />
      </div>
    </article>
  )
}
