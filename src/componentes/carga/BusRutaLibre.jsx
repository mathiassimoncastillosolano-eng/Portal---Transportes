/**
 * Bus interprovincial de RutaLibre dibujado en SVG (sin imágenes ni emojis).
 *
 * Coordenadas locales: el suelo es y = 0, la parte trasera x = 0 y el frente
 * x = 124 (el bus avanza hacia la derecha). Se coloca con un <g transform>.
 * Los colores salen de variables CSS (--ruta-bus-*, --acento) definidas en
 * cargadorRutaLibre.css, así respeta modo claro/oscuro. Las animaciones
 * (ruedas, vibración, reflejo, faro) viven en el CSS, no aquí.
 *
 * `apagado`    bus detenido y atenuado (estados de error / vacío).
 * `emergencia` intermitentes ámbar (solo error).
 */
export function BusRutaLibre({ uid, apagado = false, emergencia = false }) {
  const id = (nombre) => `${uid}-${nombre}`
  const clase = `bus${apagado ? ' bus--apagado' : ''}${emergencia ? ' bus--emergencia' : ''}`

  return (
    <g className={clase}>
      <defs>
        <linearGradient id={id('cuerpo')} x1="0" y1="-46" x2="0" y2="-6" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--ruta-bus-1)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--ruta-bus-2)' }} />
          <stop offset="1" style={{ stopColor: 'var(--ruta-bus-3)' }} />
        </linearGradient>
        <linearGradient id={id('vidrio')} x1="0" y1="-39" x2="0" y2="-26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#21495A" />
          <stop offset="1" stopColor="#081A21" />
        </linearGradient>
        <linearGradient id={id('reflejo')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.42" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('haz')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFF3C4" stopOpacity="0.5" />
          <stop offset="1" stopColor="#FFF3C4" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('sombra')}>
          <stop offset="0" style={{ stopColor: 'var(--ruta-sombra-c)', stopOpacity: 'var(--ruta-sombra-o)' }} />
          <stop offset="1" style={{ stopColor: 'var(--ruta-sombra-c)', stopOpacity: 0 }} />
        </radialGradient>
        <clipPath id={id('vidrios')}>
          <VidriosLaterales />
          <path d={PARABRISAS} />
        </clipPath>
      </defs>

      <ellipse className="bus__sombra" cx="62" cy="0.6" rx="70" ry="4" fill={`url(#${id('sombra')})`} />

      {/* Partículas muy sutiles detrás del bus (solo visibles mientras avanza) */}
      <g className="bus__estela">
        <circle className="bus__particula" cx="-4" cy="-4.5" r="1.5" />
        <circle className="bus__particula" cx="-9" cy="-8" r="1.1" />
        <circle className="bus__particula" cx="-3" cy="-11" r="1" />
        <line className="bus__rafaga" x1="-8" y1="-24" x2="-24" y2="-24" />
        <line className="bus__rafaga" x1="-6" y1="-32" x2="-18" y2="-32" />
      </g>

      <g className="bus__vibra">
        <polygon className="bus__haz" points="123,-19 156,-24 156,-6 123,-13" fill={`url(#${id('haz')})`} />

        {/* Techo (aire acondicionado) y carrocería */}
        <rect className="bus__techo" x="24" y="-49.5" width="26" height="4.5" rx="2.2" />
        <rect className="bus__techo" x="62" y="-49.5" width="26" height="4.5" rx="2.2" />
        <path className="bus__cuerpo" fill={`url(#${id('cuerpo')})`} d={CARROCERIA} />
        <path className="bus__faldon" d="M0 -12 H124 V-12 Q124 -6 118 -6 H6 Q0 -6 0 -12 Z" />
        <path className="bus__brillo" d="M8 -45.4 H100 Q107.4 -45.4 112 -40.6" />
        <path className="bus__franja" d="M1 -18 H123" />

        {/* Ventanas, parabrisas y reflejo dinámico */}
        <g fill={`url(#${id('vidrio')})`}>
          <VidriosLaterales />
          <path d={PARABRISAS} />
        </g>
        <g clipPath={`url(#${id('vidrios')})`}>
          <g className="bus__reflejo">
            <rect x="-26" y="-42" width="16" height="20" transform="skewX(-22)" fill={`url(#${id('reflejo')})`} />
          </g>
        </g>

        {/* Luces */}
        <circle className="bus__faro" cx="122.4" cy="-15.5" r="2.2" />
        <rect className="bus__trasera" x="-0.4" y="-17" width="1.7" height="5" rx="0.8" />
        <circle className="bus__intermitente" cx="123" cy="-9.5" r="1.6" />
        <circle className="bus__intermitente" cx="1" cy="-9.5" r="1.6" />

        {/* Ruedas: el giro total se corresponde con la distancia recorrida */}
        <Rueda cx={24} />
        <Rueda cx={96} />
      </g>
    </g>
  )
}

// Carrocería: techo plano, frente inclinado y esquinas suaves.
const CARROCERIA =
  'M0 -12 V-38 Q0 -46 8 -46 H100 Q108 -46 113 -41 L122 -30 Q124 -27.5 124 -23 V-12 Q124 -6 118 -6 H6 Q0 -6 0 -12 Z'

const PARABRISAS = 'M100 -39 H106.2 Q109.2 -39 111.2 -36.6 L118.2 -28.4 Q119.4 -27 118.6 -26 H100 Z'

const VENTANAS_X = [8, 24, 40, 56, 72, 88]

function VidriosLaterales() {
  return (
    <>
      {VENTANAS_X.map((x) => (
        <rect key={x} x={x} y="-39" width="14" height="13" rx="3" />
      ))}
    </>
  )
}

function Rueda({ cx }) {
  return (
    <g transform={`translate(${cx} -7)`}>
      <path className="bus__arco" d="M-10 1 A10 10 0 0 1 10 1 Z" />
      <circle className="bus__neumatico" r="7" />
      <g className="bus__giro">
        <circle className="bus__llanta" r="4.3" />
        {[0, 72, 144, 216, 288].map((angulo) => (
          <line key={angulo} className="bus__radio" x1="0" y1="0" x2="0" y2="-4.1" transform={`rotate(${angulo})`} />
        ))}
      </g>
      <circle className="bus__cubo" r="1.2" />
    </g>
  )
}
