import { useMemo } from 'react'
import './mapaAsientosBus.css'

const LEYENDA = [
  { estado: 'disponible', etiqueta: 'Disponible' },
  { estado: 'seleccionado', etiqueta: 'Seleccionado' },
  { estado: 'tomado', etiqueta: 'Bloqueado' },
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
  if (estado === 'tomado') {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <rect x="2.5" y="5.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    )
  }
  return null
}

function Asiento({ asiento, deshabilitadoPorTope, onSeleccionar }) {
  // esMio lo calcula el backend según la sesión: es la fuente de verdad.
  const seleccionado = Boolean(asiento.esMio)
  const ocupado = !seleccionado && asiento.estado === 'ocupado'
  const tomadoPorOtro = !seleccionado && asiento.estado === 'bloqueado'
  const noClicable = ocupado || tomadoPorOtro
  const porTope = deshabilitadoPorTope && !seleccionado && !noClicable

  const estadoVisual = ocupado ? 'ocupado' : tomadoPorOtro ? 'tomado' : seleccionado ? 'seleccionado' : 'disponible'

  const descripcionEstado = ocupado
    ? ', ocupado'
    : tomadoPorOtro
      ? ', bloqueado por otro cliente'
      : seleccionado
        ? ', seleccionado'
        : porTope
          ? ', límite de pasajeros alcanzado'
          : ', disponible'

  return (
    <button
      type="button"
      className={`asiento asiento--${estadoVisual} ${porTope ? 'asiento--bloqueado' : ''}`}
      disabled={noClicable}
      aria-pressed={seleccionado}
      aria-disabled={porTope || undefined}
      aria-label={`Asiento ${asiento.numero}${descripcionEstado}`}
      title={`Asiento ${asiento.numero}`}
      onClick={() => !noClicable && !porTope && onSeleccionar(asiento)}
    >
      <IconoAsiento estado={estadoVisual} />
      <span className="asiento__numero">{asiento.numero}</span>
    </button>
  )
}

/**
 * Mapa visual del piso activo. El estado de cada asiento (incluido si es mío)
 * viene en los datos; los clics se notifican hacia arriba.
 */
export function MapaAsientosBus({ asientos, filas, limiteAlcanzado, onSeleccionar }) {
  const filasAgrupadas = useMemo(() => {
    const mapa = new Map()
    asientos.forEach((asiento) => {
      if (!mapa.has(asiento.fila)) mapa.set(asiento.fila, { izquierda: [], derecha: [] })
      mapa.get(asiento.fila)[asiento.lado].push(asiento)
    })
    const filaMinima = asientos.reduce((min, a) => Math.min(min, a.fila), Infinity)
    return Array.from({ length: filas }, (_, indice) => mapa.get(filaMinima + indice))
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
              <span className="mapa-asientos__numero-fila" aria-hidden="true">
                {fila?.izquierda[0]?.fila ?? fila?.derecha[0]?.fila ?? indice + 1}
              </span>
              <div className="mapa-asientos__lado">
                {fila?.izquierda.map((asiento) => (
                  <Asiento key={asiento.numero} asiento={asiento} deshabilitadoPorTope={limiteAlcanzado} onSeleccionar={onSeleccionar} />
                ))}
              </div>
              <div className="mapa-asientos__pasillo" aria-hidden="true" />
              <div className="mapa-asientos__lado">
                {fila?.derecha.map((asiento) => (
                  <Asiento key={asiento.numero} asiento={asiento} deshabilitadoPorTope={limiteAlcanzado} onSeleccionar={onSeleccionar} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mapa-asientos__posterior" aria-hidden="true">Parte posterior</div>
      </div>
    </div>
  )
}