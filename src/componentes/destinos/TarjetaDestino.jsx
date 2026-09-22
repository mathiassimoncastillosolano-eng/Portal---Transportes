import './tarjetaDestino.css'

/**
 * Tarjeta puramente visual: no navega, no modifica el buscador ni
 * ejecuta ninguna acción. Solo presenta el destino.
 */
export function TarjetaDestino({ destino, grande }) {
  return (
    <article className={`tarjeta-destino ${grande ? 'tarjeta-destino--grande' : ''}`}>
      <img src={destino.imagen} alt={`Vista de ${destino.ciudad}`} loading="lazy" />
      <div className="tarjeta-destino__superposicion" />
      <div className="tarjeta-destino__contenido">
        <h3 className="tarjeta-destino__ciudad">{destino.ciudad}</h3>
        <p className="tarjeta-destino__etiqueta">Destino destacado</p>
      </div>
    </article>
  )
}
