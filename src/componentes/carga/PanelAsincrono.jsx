import { CargadorRutaLibre } from './CargadorRutaLibre'
import { EstadoRuta } from './EstadoRuta'
import { useFaseCarga } from './useFaseCarga'

/**
 * Orquesta los cuatro estados de una operación asíncrona, cada uno con su UI:
 *
 *   cargando → bus animado (CargadorRutaLibre)
 *   error    → ruta interrumpida con «Reintentar» (EstadoRuta tipo error)
 *   vacio    → sin resultados (EstadoRuta tipo vacío)
 *   éxito    → `children`, con entrada fade + translateY
 *
 * Garantiza una permanencia mínima del cargador (sin destellos), no retrasa
 * respuestas lentas, y reserva siempre el mismo alto para los tres estados
 * (sin saltos de layout ni footer subiendo).
 *
 * `children` puede ser una función: solo se invoca cuando hay contenido que
 * mostrar, útil si el contenido depende de datos que aún no existen.
 *
 * No toca la lógica de la página: solo recibe sus banderas (cargando, error,
 * vacio) y decide cómo se ve cada una.
 *
 * @param {object} props
 * @param {boolean} props.cargando
 * @param {string|boolean|null} [props.error]    texto del error, o true
 * @param {boolean} [props.vacio]
 * @param {import('./mensajesCarga').VARIANTES_CARGA} [props.variante]
 * @param {string} [props.origen]  ciudades reales (solo variante `busqueda`)
 * @param {string} [props.destino]
 * @param {() => void} [props.alReintentar]   si existe, el error muestra «Reintentar»
 * @param {{titulo?: string, texto?: string}} [props.estadoError]
 * @param {{titulo?: string, texto?: string, accion?: {texto: string, alClick?: Function, to?: string}}} [props.estadoVacio]
 * @param {number} [props.retardoMs]  no mostrar cargador si termina antes (p. ej. verificar sesión)
 * @param {boolean} [props.entrada]   false: sin animación de entrada (envolturas de layout)
 * @param {string} [props.contenedorCarga] clase de un <div> que envuelve SOLO al cargador
 *                 (para darle márgenes cuando el contenido ya trae los suyos)
 */
export function PanelAsincrono({
  cargando,
  error = null,
  vacio = false,
  variante = 'generico',
  origen,
  destino,
  mensaje,
  mensajeEspera,
  mensajeListo,
  detalle,
  compacto = false,
  pagina = false,
  retardoMs = 0,
  alReintentar,
  estadoError = {},
  estadoVacio = {},
  entrada = true,
  contenedorCarga,
  className = '',
  children,
}) {
  const hayError = Boolean(error)
  const { fase: faseHook, ciclo, entrando } = useFaseCarga(cargando, { falla: hayError, retardoMs })

  // `cargando` pasa a true un render antes de que el hook cambie de fase (lo
  // hace en un efecto): jamás se debe pintar contenido (ni datos viejos) en ese render.
  const fase = cargando && faseHook === 'contenido' ? (retardoMs > 0 ? 'pendiente' : 'viajando') : faseHook

  if (fase !== 'contenido') {
    const cargador = (
      <CargadorRutaLibre
        variante={variante}
        fase={fase}
        ciclo={ciclo}
        falla={hayError}
        origen={origen}
        destino={destino}
        mensaje={mensaje}
        mensajeEspera={mensajeEspera}
        mensajeListo={mensajeListo}
        detalle={detalle}
        compacto={compacto}
        pagina={pagina}
        className={className}
      />
    )
    return contenedorCarga ? <div className={contenedorCarga}>{cargador}</div> : cargador
  }

  const conEntrada = entrada && entrando

  if (hayError) {
    return (
      <EstadoRuta
        tipo="error"
        titulo={estadoError.titulo}
        texto={estadoError.texto ?? (typeof error === 'string' ? error : undefined)}
        accion={alReintentar ? { texto: 'Reintentar', alClick: alReintentar } : undefined}
        compacto={compacto}
        entrando={conEntrada}
        className={className}
      />
    )
  }

  if (vacio) {
    return (
      <EstadoRuta
        tipo="vacio"
        titulo={estadoVacio.titulo}
        texto={estadoVacio.texto}
        accion={estadoVacio.accion}
        compacto={compacto}
        entrando={conEntrada}
        className={className}
      />
    )
  }

  const contenido = typeof children === 'function' ? children() : children
  return <div className={`carga-contenido${conEntrada ? ' carga-entrada' : ''} ${className}`.trim()}>{contenido}</div>
}
