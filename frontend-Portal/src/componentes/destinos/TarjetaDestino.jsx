import { Link } from 'react-router-dom'
import './tarjetaDestino.css'

export function TarjetaDestino({ destino, grande }) {
  return (
    <Link to={`/destinos/${destino.id}`} className={`tarjeta-destino ${grande ? 'tarjeta-destino--grande' : ''}`} aria-label={`Conocer ${destino.ciudad}`}>
      <img src={destino.imagen} alt="" loading="lazy" />
      <div className="tarjeta-destino__superposicion" />
      <div className="tarjeta-destino__contenido">
        <h3 className="tarjeta-destino__ciudad">{destino.ciudad}</h3>
        <p className="tarjeta-destino__etiqueta">Destino destacado</p>
      </div>
    </Link>
  )
}
