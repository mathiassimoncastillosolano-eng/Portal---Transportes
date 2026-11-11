import { useEffect, useId, useRef } from 'react'
import { ESTADOS_INICIO, describirEstado, etapaDe } from '../../utilidades/inicializacion'
import './pantallaInicializacion.css'

// Geometría de la ruta (unidades del viewBox 600 × 132).
const DEPOSITO_X = 56
const PARADAS = [
  { x: 210, etiqueta: 'Conexión' },
  { x: 365, etiqueta: 'Servicios' },
  { x: 520, etiqueta: 'Sistemas' },
]
const VIA_Y = 86
const LARGO_VIA = PARADAS[PARADAS.length - 1].x - DEPOSITO_X
const ANCHO_VB = 600

/**
 * Pantalla de arranque global de RutaLibre (exclusiva de la inicialización).
 *
 * Es presentacional: el estado real lo decide ProveedorInicializacion. Cada parada se marca SOLO
 * cuando el backend la confirma (ver etapaDe): no hay porcentajes ni progreso simulado. La línea
 * punteada que avanza delante del bus indica actividad, no avance.
 *
 * Independiente de los cargadores de módulos (componentes/carga), que no se tocan.
 */
export function PantallaInicializacion({
  estado,
  tipo,
  lento = false,
  sinInternet = false,
  saliendo = false,
  onSalidaCompleta,
  onReintentar,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const botonRef = useRef(null)
  const raizRef = useRef(null)

  const listo = estado === ESTADOS_INICIO.READY
  const conError = estado === ESTADOS_INICIO.ERROR
  const { completadas, activa } = etapaDe(listo ? 'LISTO' : tipo)
  const mensaje = describirEstado({ estado, tipo, lento, sinInternet })

  const busX = completadas === 0 ? DEPOSITO_X : PARADAS[completadas - 1].x
  const destinoActivo = activa >= 0 ? PARADAS[activa].x : null
  const recorrido = busX - DEPOSITO_X

  // Llevar el foco al botón cuando aparece el error (teclado y lectores de pantalla).
  useEffect(() => {
    if (conError) botonRef.current?.focus()
  }, [conError])

  // Fin del fundido de salida. Respaldo por si transitionend no llega (pestaña oculta, etc.).
  useEffect(() => {
    if (!saliendo) return undefined
    const nodo = raizRef.current
    let hecho = false
    const terminar = () => {
      if (hecho) return
      hecho = true
      onSalidaCompleta?.()
    }
    const alTerminar = (evento) => {
      if (evento.target === nodo && evento.propertyName === 'opacity') terminar()
    }
    nodo?.addEventListener('transitionend', alTerminar)
    const respaldo = setTimeout(terminar, 900)
    return () => {
      nodo?.removeEventListener('transitionend', alTerminar)
      clearTimeout(respaldo)
    }
  }, [saliendo, onSalidaCompleta])

  const clases = [
    'inicio-rl',
    listo && 'inicio-rl--listo',
    conError && 'inicio-rl--error',
    sinInternet && 'inicio-rl--sin-red',
    saliendo && 'inicio-rl--saliendo',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={raizRef} className={clases} aria-busy={!listo && !conError}>
      <div className="inicio-rl__fondo" aria-hidden="true">
        <span className="inicio-rl__halo inicio-rl__halo--a" />
        <span className="inicio-rl__halo inicio-rl__halo--b" />
        <span className="inicio-rl__reticula" />
      </div>

      <header className="inicio-rl__marca">
        <svg className="inicio-rl__logo" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#0F4C5C" />
          <path d="M8 20 L16 9 L24 20" stroke="#2DD4A8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="24" r="2" fill="#2DD4A8" />
        </svg>
        <span className="inicio-rl__nombre">
          Ruta<strong>Libre</strong>
        </span>
      </header>

      <main className="inicio-rl__centro">
        <div className="inicio-rl__escena">
          <svg
            className="inicio-rl__ruta"
            viewBox={`0 0 ${ANCHO_VB} 132`}
            role="img"
            aria-label={`Etapas confirmadas: ${completadas} de ${PARADAS.length}`}
          >
            <defs>
              <linearGradient id={`via-${uid}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#10B981" />
                <stop offset="1" stopColor="#2DD4D4" />
              </linearGradient>
              <linearGradient id={`carroceria-${uid}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#F7FBFC" />
                <stop offset="1" stopColor="#CFE3E7" />
              </linearGradient>
              <linearGradient id={`haz-${uid}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#E9FFF8" stopOpacity="0.55" />
                <stop offset="1" stopColor="#E9FFF8" stopOpacity="0" />
              </linearGradient>
              <filter id={`brillo-${uid}`} x="-20%" y="-200%" width="140%" height="500%">
                <feGaussianBlur stdDeviation="3.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Calzada */}
            <line className="inicio-rl__via-base" x1={DEPOSITO_X - 30} x2={ANCHO_VB - 24} y1={VIA_Y} y2={VIA_Y} />
            <line className="inicio-rl__via-carril" x1={DEPOSITO_X - 30} x2={ANCHO_VB - 24} y1={VIA_Y} y2={VIA_Y} />

            {/* Tramo confirmado: se ilumina hasta la última parada confirmada */}
            <line
              className="inicio-rl__via-luz"
              x1={DEPOSITO_X}
              x2={DEPOSITO_X + LARGO_VIA}
              y1={VIA_Y}
              y2={VIA_Y}
              stroke={`url(#via-${uid})`}
              filter={`url(#brillo-${uid})`}
              style={{ strokeDasharray: LARGO_VIA, strokeDashoffset: LARGO_VIA - recorrido }}
            />

            {/* Actividad hacia la parada en comprobación (no es progreso) */}
            {destinoActivo !== null && !conError && (
              <line
                className="inicio-rl__via-actividad"
                x1={busX + 42}
                x2={destinoActivo - 12}
                y1={VIA_Y}
                y2={VIA_Y}
              />
            )}

            {/* Depósito de salida */}
            <g className="inicio-rl__deposito" transform={`translate(${DEPOSITO_X} ${VIA_Y})`}>
              <rect x="-5" y="-5" width="10" height="10" rx="2.5" />
            </g>

            {/* Paradas */}
            {PARADAS.map((parada, i) => {
              const hecha = i < completadas
              const enCurso = i === activa && !conError
              return (
                <g
                  key={parada.etiqueta}
                  className={[
                    'inicio-rl__parada',
                    hecha && 'inicio-rl__parada--hecha',
                    enCurso && 'inicio-rl__parada--activa',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  transform={`translate(${parada.x} ${VIA_Y})`}
                >
                  <circle className="inicio-rl__parada-onda" r="11" />
                  <circle className="inicio-rl__parada-anillo" r="9" />
                  <circle className="inicio-rl__parada-nucleo" r="5.5" />
                  <path className="inicio-rl__parada-check" d="M-3.4 0.2 L-1 2.6 L3.6 -2.2" />
                </g>
              )
            })}

            {/* Bus */}
            <g className="inicio-rl__bus-pos" style={{ transform: `translate(${busX}px, ${VIA_Y}px)` }}>
              <g className="inicio-rl__bus" transform="translate(-35 -55) scale(1.25)">
                <path className="inicio-rl__bus-haz" d="M54 26 L96 18 L96 40 L54 32 Z" fill={`url(#haz-${uid})`} />
                <rect x="0" y="6" width="56" height="28" rx="7" fill={`url(#carroceria-${uid})`} />
                <path d="M47 6 h2 a7 7 0 0 1 7 7 v8 h-9 z" fill="#0B3540" opacity="0.92" />
                <rect x="5" y="11" width="11" height="9" rx="2" fill="#0B3540" />
                <rect x="18" y="11" width="11" height="9" rx="2" fill="#0B3540" />
                <rect x="31" y="11" width="11" height="9" rx="2" fill="#0B3540" />
                <rect x="0" y="23" width="56" height="3" fill="#10B981" />
                <rect x="53" y="27" width="3" height="3" rx="1" fill="#FDE68A" />
                <g className="inicio-rl__rueda" transform="translate(13 34)">
                  <circle r="5.5" fill="#071E25" />
                  <circle r="2.2" fill="#93A2B3" />
                  <rect x="-0.6" y="-4.6" width="1.2" height="2.4" fill="#93A2B3" />
                </g>
                <g className="inicio-rl__rueda" transform="translate(43 34)">
                  <circle r="5.5" fill="#071E25" />
                  <circle r="2.2" fill="#93A2B3" />
                  <rect x="-0.6" y="-4.6" width="1.2" height="2.4" fill="#93A2B3" />
                </g>
              </g>
            </g>
          </svg>

          <ol className="inicio-rl__etapas">
            {PARADAS.map((parada, i) => (
              <li
                key={parada.etiqueta}
                style={{ left: `${(parada.x / ANCHO_VB) * 100}%` }}
                className={[
                  i < completadas && 'es-hecha',
                  i === activa && !conError && 'es-activa',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {parada.etiqueta}
                <span className="inicio-rl__solo-lector">
                  {i < completadas ? ' (confirmado)' : i === activa ? ' (comprobando)' : ' (pendiente)'}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="inicio-rl__texto" role="status" aria-live="polite" aria-atomic="true">
          <h1 key={mensaje.clave} className="inicio-rl__titulo">
            {mensaje.titulo}
          </h1>
          <p className="inicio-rl__detalle">{mensaje.detalle}</p>
        </div>

        {conError && (
          <div className="inicio-rl__acciones">
            <button ref={botonRef} type="button" className="inicio-rl__boton" onClick={onReintentar}>
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M16 10a6 6 0 1 1-1.76-4.24M16 4v3.5h-3.5" />
              </svg>
              Reintentar
            </button>
          </div>
        )}
      </main>

      <footer className="inicio-rl__pie">Transporte terrestre de pasajeros</footer>
    </div>
  )
}
