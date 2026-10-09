import { BusRutaLibre } from './BusRutaLibre'

/*
 * Escenas SVG del sistema de carga. Todas comparten el mismo viewBox de
 * 560 unidades de ancho: el escalado es responsive por CSS (width: 100%) y el
 * bus, la ruta y el destino siempre quedan alineados, sin recortes.
 *
 * Geometría de la escena de ruta (unidades del viewBox):
 *   origen x = 34 · destino x = 526 · carretera y = 112
 *   el bus (124 de largo) arranca con su parte trasera en x = 20 y se detiene
 *   358 unidades después, frente al destino. Esa cifra (358) está repetida en
 *   cargadorRutaLibre.css como --recorrido; si cambia aquí, cambia allí.
 */

const VIEWBOX_RUTA = '0 52 560 82'
const Y_CARRETERA = 112

function Via({ interrumpida = false }) {
  return (
    <>
      <line className="carga__via" x1="28" y1={Y_CARRETERA} x2="532" y2={Y_CARRETERA} />
      {interrumpida ? (
        <>
          <line className="carga__ruta" x1="34" y1={Y_CARRETERA} x2="304" y2={Y_CARRETERA} />
          <line className="carga__ruta" x1="356" y1={Y_CARRETERA} x2="526" y2={Y_CARRETERA} />
        </>
      ) : (
        <line className="carga__ruta" x1="34" y1={Y_CARRETERA} x2="526" y2={Y_CARRETERA} />
      )}
    </>
  )
}

function Origen() {
  return (
    <g className="carga__origen" transform={`translate(34 ${Y_CARRETERA})`}>
      <circle className="carga__origen-aro" r="6.5" />
      <circle className="carga__origen-punto" r="2.6" />
    </g>
  )
}

function Destino() {
  return (
    <g className="carga__destino" transform={`translate(526 ${Y_CARRETERA})`}>
      <ellipse className="carga__onda" rx="9" ry="3" />
      <path className="carga__pin" d="M0 0 C-3 -6 -11 -12 -11 -22 A11 11 0 0 1 11 -22 C11 -12 3 -6 0 0 Z" />
      <circle className="carga__pin-centro" cx="0" cy="-22" r="4" />
      <path className="carga__pin-check" d="M-5 -22.4 L-1.6 -19 L5 -26" />
    </g>
  )
}

/** Escena de carga estándar: el bus recorre la ruta de origen a destino. */
export function EscenaRuta({ uid }) {
  return (
    <svg className="carga__svg" viewBox={VIEWBOX_RUTA} aria-hidden="true" focusable="false">
      <Via />
      <line className="carga__trazo" x1="34" y1={Y_CARRETERA} x2="526" y2={Y_CARRETERA} />
      <line className="carga__trazo carga__trazo--final" x1="34" y1={Y_CARRETERA} x2="526" y2={Y_CARRETERA} />
      <Origen />
      <Destino />
      <g transform={`translate(20 ${Y_CARRETERA + 3})`}>
        <g className="carga__bus">
          <BusRutaLibre uid={uid} />
        </g>
      </g>
    </svg>
  )
}

const COLUMNAS_ASIENTOS = 10
const FILAS_ASIENTOS_Y = [30, 50, 84, 104]

/** Escena de asientos: plano del bus visto desde arriba que se "escanea". */
export function EscenaAsientos({ uid }) {
  const asientos = []
  FILAS_ASIENTOS_Y.forEach((y, fila) => {
    for (let columna = 0; columna < COLUMNAS_ASIENTOS; columna += 1) {
      asientos.push({ x: 66 + columna * 38, y, columna, fila })
    }
  })

  return (
    <svg className="carga__svg" viewBox="0 0 560 150" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${uid}-casco`}>
          <rect x="40" y="22" width="480" height="106" rx="28" />
        </clipPath>
        <linearGradient id={`${uid}-barrido`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--acento)', stopOpacity: 0 }} />
          <stop offset="0.7" style={{ stopColor: 'var(--acento)', stopOpacity: 0.3 }} />
          <stop offset="1" style={{ stopColor: 'var(--acento)', stopOpacity: 0 }} />
        </linearGradient>
      </defs>

      <rect className="carga__casco" x="40" y="22" width="480" height="106" rx="28" />
      <path className="carga__cabina" d="M448 32 V118" />
      <path className="carga__parabrisas" d="M514 42 Q530 75 514 108" />
      <circle className="carga__volante" cx="486" cy="75" r="8" />
      <circle className="carga__volante-centro" cx="486" cy="75" r="1.8" />

      <g clipPath={`url(#${uid}-casco)`}>
        {asientos.map(({ x, y, columna, fila }) => (
          <g
            key={`${columna}-${fila}`}
            className="carga__asiento"
            style={{ '--c': columna, '--f': fila }}
          >
            <rect className="carga__asiento-base" x={x} y={y} width="22" height="16" rx="5" />
            <rect className="carga__asiento-luz" x={x} y={y} width="22" height="16" rx="5" />
            <rect className="carga__respaldo" x={x} y={y} width="5" height="16" rx="2.5" />
          </g>
        ))}
        <rect className="carga__barrido" x="-70" y="22" width="70" height="106" fill={`url(#${uid}-barrido)`} />
      </g>

      <g className="carga__confirma" transform="translate(248 75)">
        <circle className="carga__confirma-fondo" r="10" />
        <path className="carga__confirma-check" d="M-4.6 0.2 L-1.4 3.4 L4.8 -3.6" />
      </g>
    </svg>
  )
}

/** Escena de error (ruta interrumpida) o vacío (sin viajes): bus detenido y atenuado. */
export function EscenaEstado({ tipo, uid }) {
  const esError = tipo === 'error'

  return (
    <svg className="carga__svg estado-ruta__svg" viewBox={VIEWBOX_RUTA} aria-hidden="true" focusable="false">
      <Via interrumpida={esError} />
      {esError && <line className="carga__trazo carga__trazo--detenido" x1="34" y1={Y_CARRETERA} x2="264" y2={Y_CARRETERA} />}
      <Origen />
      <Destino />

      {esError ? (
        <g className="estado-ruta__marca estado-ruta__marca--error" transform={`translate(330 ${Y_CARRETERA})`}>
          <path className="estado-ruta__triangulo" d="M0 -26 L13 -4 H-13 Z" />
          <path className="estado-ruta__simbolo" d="M0 -19 V-12" />
          <circle className="estado-ruta__punto" cx="0" cy="-8" r="1.1" />
        </g>
      ) : (
        <g className="estado-ruta__marca estado-ruta__marca--vacio" transform={`translate(300 ${Y_CARRETERA})`}>
          <circle className="estado-ruta__cruz-fondo" r="11" />
          <path className="estado-ruta__cruz" d="M-4.5 -4.5 L4.5 4.5 M4.5 -4.5 L-4.5 4.5" />
        </g>
      )}

      <g transform={`translate(${esError ? 168 : 20} ${Y_CARRETERA + 3})`}>
        <BusRutaLibre uid={uid} apagado emergencia={esError} />
      </g>
    </svg>
  )
}
