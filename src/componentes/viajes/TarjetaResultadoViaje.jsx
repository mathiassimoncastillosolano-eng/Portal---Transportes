import { EstadoDisponibilidad } from '../comunes/EstadoDisponibilidad'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { formatearPrecio, formatearFechaCorta } from '../../utilidades/formato'
import './tarjetaResultadoViaje.css'
import { useState } from 'react'
import { obtenerDetalleViaje } from '../../servicios/viajesServicio'
import { BotonSecundario } from '../comunes/BotonSecundario'

const ICONOS_SERVICIO = {
  WiFi: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 7.5c3.9-3.8 10.1-3.8 14 0M6 11c2.2-2 5.8-2 8 0M9 14.3c.6-.5 1.4-.5 2 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="10" cy="16.2" r="1" fill="currentColor" />
    </svg>
  ),
  Baño: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 9V5.5A2.5 2.5 0 0 1 7.5 3h1A2.5 2.5 0 0 1 11 5.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3" y="9" width="14" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  TV: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="4.5" width="15" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 17.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  Snack: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 4h10l-1.2 12.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 4h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  USB: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="8.3" y="2.5" width="3.4" height="7" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 9.5v4M10 13.5l-3 2.5M10 13.5l3 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  'Cabina privada': (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 4v12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
}

/**
 * Tarjeta de resultado de viaje. Dos columnas en escritorio: contenido
 * (empresa, horario, comodidades) y una franja de precio + CTA, similar en
 * jerarquía a la referencia pero con la identidad visual de RutaLibre.
 */
export function TarjetaResultadoViaje({ resultado, esMasEconomico, alSeleccionar }) {
  const [detalle, setDetalle] = useState(null)
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState(null)
  const actual = detalle ?? resultado
  const agotado = actual.estado === 'agotado' || actual.asientosDisponibles <= 0 || actual.precio == null

  async function consultarDetalle(seleccionar = false) {
    setCargando(true)
    setErrorDetalle(null)
    try {
      const viaje = await obtenerDetalleViaje(resultado.id)
      setDetalle(viaje)
      if (seleccionar && viaje.asientosDisponibles > 0 && viaje.precio != null && viaje.estado !== 'agotado') {
        alSeleccionar(viaje)
      } else setAbierto(true)
    } catch (err) {
      setErrorDetalle(err.message)
      setAbierto(true)
    } finally { setCargando(false) }
  }

  return (
    <article className={`tarjeta-resultado-viaje ${agotado ? 'tarjeta-resultado-viaje--agotado' : ''}`}>
      {esMasEconomico && !agotado && (
        <span className="tarjeta-resultado-viaje__insignia">Más económico</span>
      )}

      <div className="tarjeta-resultado-viaje__principal">
        <div className="tarjeta-resultado-viaje__empresa">
          <span className="tarjeta-resultado-viaje__logo" aria-hidden="true">
            {resultado.empresa.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <span className="tarjeta-resultado-viaje__empresa-nombre">{resultado.empresa}</span>
            <span className="tarjeta-resultado-viaje__servicio-nombre">{resultado.tipoBus}</span>
          </div>
        </div>

        <div className="tarjeta-resultado-viaje__horario">
          <div className="tarjeta-resultado-viaje__punto">
            <span className="tarjeta-resultado-viaje__hora">{resultado.horaSalida}</span>
            <span className="tarjeta-resultado-viaje__ciudad">{resultado.origen}</span>
          </div>

          <div className="tarjeta-resultado-viaje__linea">
            <span className="tarjeta-resultado-viaje__duracion">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {resultado.duracion}
            </span>
            <div className="tarjeta-resultado-viaje__trazo" />
            <span className="tarjeta-resultado-viaje__directo">Directo</span>
          </div>

          <div className="tarjeta-resultado-viaje__punto tarjeta-resultado-viaje__punto--derecha">
            <span className="tarjeta-resultado-viaje__hora">{resultado.horaLlegada ?? 'Por confirmar'}</span>
            {resultado.fechaLlegada && resultado.fechaLlegada !== resultado.fechaSalida && (
              <span className="tarjeta-resultado-viaje__duracion">Llega el {formatearFechaCorta(resultado.fechaLlegada)}</span>
            )}
            <span className="tarjeta-resultado-viaje__ciudad">{resultado.destino}</span>
          </div>
        </div>

        <div className="tarjeta-resultado-viaje__pie-principal">
          <div className="tarjeta-resultado-viaje__servicios">
            {resultado.servicios.map((servicio) => (
              <span className="tarjeta-resultado-viaje__pill" key={servicio}>
                {ICONOS_SERVICIO[servicio]}
                {servicio}
              </span>
            ))}
          </div>
          <EstadoDisponibilidad estado={actual.estado} asientosDisponibles={actual.asientosDisponibles} />
        </div>
        <BotonSecundario aria-expanded={abierto} aria-controls={`detalle-viaje-${resultado.id}`}
          deshabilitado={cargando} onClick={() => abierto ? setAbierto(false) : consultarDetalle()}>
          {cargando ? 'Consultando…' : abierto ? 'Ocultar detalle' : 'Ver detalle'}
        </BotonSecundario>
        {abierto && <section id={`detalle-viaje-${resultado.id}`} aria-label="Detalle del viaje" aria-live="polite">
          {errorDetalle ? <div role="alert"><p>{errorDetalle}</p>
            <BotonSecundario onClick={() => consultarDetalle()}>Reintentar detalle</BotonSecundario></div> : detalle && <>
            <h3>{detalle.origen} → {detalle.destino}</h3>
            <p>Salida: {formatearFechaCorta(detalle.fechaSalida)} · {detalle.horaSalida}</p>
            <p>Llegada: {detalle.fechaLlegada ? formatearFechaCorta(detalle.fechaLlegada) : 'Por confirmar'} · {detalle.horaLlegada ?? 'Por confirmar'}</p>
            <p>Duración: {detalle.duracion} · Servicio: {detalle.tipoBus}</p>
            <p>Comodidades: {detalle.servicios.length ? detalle.servicios.join(', ') : 'Sin comodidades informadas'}</p>
            <p>Asientos disponibles: {detalle.asientosDisponibles}</p>
            <p>Precio desde: {detalle.precio == null ? 'No disponible' : formatearPrecio(detalle.precio)}</p>
            <p>La disponibilidad puede cambiar hasta confirmar la reserva.</p>
          </>}
        </section>}
      </div>

      <div className="tarjeta-resultado-viaje__lateral">
        <div className="tarjeta-resultado-viaje__precio-columna">
          <span className="tarjeta-resultado-viaje__precio-etiqueta">Desde, por persona</span>
          <span className="tarjeta-resultado-viaje__precio">{actual.precio == null ? 'No disponible' : formatearPrecio(actual.precio)}</span>
        </div>
        <BotonPrincipal deshabilitado={agotado || cargando || Boolean(errorDetalle)} onClick={() => consultarDetalle(true)} ancho="100%">
          {agotado ? 'Sin cupo' : 'Elegir asientos →'}
        </BotonPrincipal>
      </div>
    </article>
  )
}
