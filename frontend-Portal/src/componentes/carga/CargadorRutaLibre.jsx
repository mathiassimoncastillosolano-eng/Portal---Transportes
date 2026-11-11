import { useId } from 'react'
import { EscenaAsientos, EscenaRuta } from './EscenasCarga'
import { VARIANTES_CARGA, limpiarMensaje } from './mensajesCarga'
import './cargadorRutaLibre.css'

/**
 * Cargador visual de RutaLibre: un bus recorre una ruta de origen a destino.
 *
 * Es presentacional: la fase (`viajando`, `esperando`, `llegada`, `saliendo`,
 * `pendiente`) la decide `useFaseCarga`. Normalmente no se usa directamente:
 * `PanelAsincrono` lo combina con el hook y con los estados de error/vacío.
 * Úsalo suelto solo en pantallas con early-return (ver PaginaReserva).
 *
 * Variantes: destinos · busqueda · asientos · servicios · procesamiento · generico
 *
 * @param {object} props
 * @param {keyof typeof VARIANTES_CARGA} [props.variante]
 * @param {string} [props.fase]
 * @param {number} [props.ciclo]      cambia en cada viaje nuevo (reinicia el SVG)
 * @param {boolean} [props.falla]     la operación falló: el bus se detiene, sin ✓
 * @param {string} [props.origen]     solo variante `busqueda`: ciudades reales de la búsqueda
 * @param {string} [props.destino]
 * @param {string} [props.mensaje]    sustituye el texto por defecto de la variante
 * @param {string} [props.detalle]    línea secundaria opcional
 * @param {boolean} [props.compacto]  versión pequeña para usar dentro de una tarjeta
 * @param {boolean} [props.pagina]    ocupa el alto de una página completa
 */
export function CargadorRutaLibre({
  variante = 'generico',
  fase = 'viajando',
  ciclo = 0,
  falla = false,
  origen,
  destino,
  mensaje,
  mensajeEspera,
  mensajeListo,
  detalle,
  compacto = false,
  pagina = false,
  className = '',
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const config = VARIANTES_CARGA[variante] ?? VARIANTES_CARGA.generico

  const confirmado = (fase === 'llegada' || fase === 'saliendo') && !falla
  const clases = [
    'carga',
    `carga--${fase}`,
    `carga--${variante}`,
    confirmado && 'carga--confirmado',
    falla && 'carga--falla',
    compacto && 'carga--compacto',
    pagina && 'carga--pagina',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // Mientras la operación es rápida y aún no vale la pena mostrar nada, se
  // reserva el espacio (sin saltos de layout) pero no se dibuja el cargador.
  if (fase === 'pendiente') return <div className={clases} aria-busy="true" />

  let texto
  if (confirmado) texto = mensajeListo ?? config.listo
  else if (fase === 'esperando') texto = mensajeEspera ?? config.espera
  else texto = mensaje ?? config.mensaje
  texto = limpiarMensaje(texto)

  const mostrarCiudades = variante === 'busqueda' && origen && destino

  return (
    <div className={clases} aria-busy={!confirmado}>
      {!compacto && <p className="carga__etiqueta">{config.etiqueta}</p>}

      <div className="carga__escena" key={ciclo}>
        {variante === 'asientos' ? <EscenaAsientos uid={uid} /> : <EscenaRuta uid={uid} />}
        {mostrarCiudades && (
          <div className="carga__ciudades">
            <span title={origen}>{origen}</span>
            <span title={destino}>{destino}</span>
          </div>
        )}
      </div>

      <p className="carga__mensaje" role="status" aria-live="polite">
        <span className="carga__texto" key={`${fase}-${confirmado}`}>
          {confirmado && (
            <svg className="carga__visto" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3.2 8.4 6.5 11.6 12.8 4.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {texto}
          {!confirmado && (
            <span className="carga__puntos" aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          )}
        </span>
      </p>

      {detalle && <p className="carga__detalle">{detalle}</p>}
    </div>
  )
}
