import { useMemo } from 'react'
import { formatearPrecio } from '../../utilidades/formato'
import './mapaAsientosBus.css'

const LEYENDA = [
  { estado: 'disponible', etiqueta: 'Disponible' },
  { estado: 'preferencial', etiqueta: 'Preferencial' },
  { estado: 'seleccionado', etiqueta: 'Seleccionado' },
  { estado: 'ocupado', etiqueta: 'Ocupado' },
]

function IconoAsiento({ estado }) {
  if (estado === 'ocupado') {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    )
  }
  if (estado === 'seleccionado') {
    return (
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M2.5 7.3 5.5 10.3 11.5 3.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return null
}

function Asiento({ asiento, seleccionado, deshabilitadoPorTope, onSeleccionar }) {
  const ocupado = asiento.estado === 'ocupado'
  const bloqueado = ocupado || (deshabilitadoPorTope && !seleccionado)
  const estadoVisual = ocupado
    ? 'ocupado'
    : seleccionado
      ? 'seleccionado'
      : asiento.tipo === 'preferencial'
        ? 'preferencial'
        : 'disponible'

  const descripcionEstado = ocupado
    ? ', ocupado'
    : seleccionado
      ? ', seleccionado'
      : deshabilitadoPorTope
        ? ', límite de pasajeros alcanzado'
        : ', disponible'

  return (
    <button
      type="button"
      className={`asiento asiento--${estadoVisual} ${bloqueado && !ocupado ? 'asiento--bloqueado' : ''}`}
      disabled={ocupado}
      aria-pressed={seleccionado}
      aria-disabled={bloqueado || undefined}
      aria-label={`Asiento ${asiento.numero}${descripcionEstado}${asiento.tipo === 'preferencial' ? ', preferencial' : ''}`}
      title={`Asiento ${asiento.numero}`}
      onClick={() => !ocupado && !(deshabilitadoPorTope && !seleccionado) && onSeleccionar(asiento)}
    >
      <IconoAsiento estado={estadoVisual} />
      <span className="asiento__numero">{asiento.numero}</span>
    </button>
  )
}

/**
 * Mapa visual del piso activo del bus. La selección es múltiple: recibe el
 * conjunto de números de asiento ya elegidos en este piso y notifica cada
 * click hacia arriba, donde vive el estado real de la compra.
 */
export function MapaAsientosBus({ asientos, filas, numerosSeleccionados, limiteAlcanzado, onSeleccionar }) {
  const filasAgrupadas = useMemo(() => {
    const mapa = new Map()
    asientos.forEach((asiento) => {
      if (!mapa.has(asiento.fila)) mapa.set(asiento.fila, { izquierda: [], derecha: [] })
      mapa.get(asiento.fila)[asiento.lado].push(asiento)
    })
    return Array.from({ length: filas }, (_, indice) => mapa.get(indice + 1))
  }, [asientos, filas])

  return (
    <div className="mapa-asientos">
      <ul className="mapa-asientos__leyenda">
        {LEYENDA.map((item) => (
          <li key={item.estado} className="mapa-asientos__leyenda-item">
            <span className={`mapa-asientos__leyenda-muestra asiento--${item.estado}`}>
              <IconoAsiento estado={item.estado} />
            </span>
            {item.etiqueta}
          </li>
        ))}
      </ul>

      <div className="mapa-asientos__carroceria">
        <div className="mapa-asientos__frente">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="2.4" fill="currentColor" />
            <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span>Cabina del conductor</span>
        </div>

        <div className="mapa-asientos__entrada">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 2h8v12H4z" stroke="currentColor" strokeWidth="1.4" />
            <path d="M4 8h-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Entrada
          <span className="mapa-asientos__entrada-separador" aria-hidden="true" />
          Pasillo
        </div>

        <div className="mapa-asientos__filas">
          {filasAgrupadas.map((fila, indice) => (
            <div className="mapa-asientos__fila" key={indice + 1}>
              <span className="mapa-asientos__numero-fila" aria-hidden="true">{indice + 1}</span>
              <div className="mapa-asientos__lado">
                {fila.izquierda.map((asiento) => (
                  <Asiento
                    key={asiento.numero}
                    asiento={asiento}
                    seleccionado={numerosSeleccionados.has(asiento.numero)}
                    deshabilitadoPorTope={limiteAlcanzado}
                    onSeleccionar={onSeleccionar}
                  />
                ))}
              </div>
              <div className="mapa-asientos__pasillo" aria-hidden="true" />
              <div className="mapa-asientos__lado">
                {fila.derecha.map((asiento) => (
                  <Asiento
                    key={asiento.numero}
                    asiento={asiento}
                    seleccionado={numerosSeleccionados.has(asiento.numero)}
                    deshabilitadoPorTope={limiteAlcanzado}
                    onSeleccionar={onSeleccionar}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mapa-asientos__posterior" aria-hidden="true">Parte posterior</div>
      </div>

      <p className="mapa-asientos__nota">
        Los asientos preferenciales tienen un costo adicional de {formatearPrecio(15)}.
      </p>
    </div>
  )
}
