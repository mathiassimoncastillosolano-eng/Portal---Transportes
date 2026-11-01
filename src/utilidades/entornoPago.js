/**
 * Entornos de pago (Sandbox / Producción) en la interfaz.
 *
 * El navegador solo SOLICITA un entorno; quien decide es el backend: valida que el usuario esté autorizado a usar
 * Sandbox y usa las credenciales del entorno correspondiente. Esta lógica únicamente ordena lo que el backend
 * informa en GET /api/pagos/configuracion (los entornos permitidos para el usuario y sus Public Keys, que son
 * públicas por diseño). Jamás maneja Access Tokens ni claves secretas.
 */

export const ENTORNO_SANDBOX = 'SANDBOX'
export const ENTORNO_PRODUCCION = 'PRODUCTION'

export const ADVERTENCIA_PRODUCCION =
  'Estás ingresando al entorno de producción. Las transacciones realizadas utilizarán dinero real y se procesarán mediante Mercado Pago.'

export const AVISO_SANDBOX =
  'Entorno de pruebas activo. Usa los datos de prueba de Mercado Pago: no se realizará ningún cobro real y la compra quedará marcada como de prueba.'

const CODIGOS_VALIDOS = new Set([ENTORNO_SANDBOX, ENTORNO_PRODUCCION])

export function esSandbox(codigo) {
  return codigo === ENTORNO_SANDBOX
}

/**
 * Normaliza la respuesta del backend. Descarta entornos desconocidos y conserva el orden recibido.
 * @returns {{ entornos: Array<{codigo:string, disponible:boolean, publicKey:string|null}>, entornoPorDefecto:string }}
 */
export function normalizarConfiguracion(respuesta) {
  const recibidos = Array.isArray(respuesta?.entornos) ? respuesta.entornos : []
  const vistos = new Set()
  const entornos = []
  for (const e of recibidos) {
    if (!CODIGOS_VALIDOS.has(e?.codigo) || vistos.has(e.codigo)) continue
    vistos.add(e.codigo)
    const publicKey = typeof e.publicKey === 'string' && e.publicKey.trim() ? e.publicKey.trim() : null
    entornos.push({ codigo: e.codigo, disponible: e.disponible === true, publicKey })
  }
  const porDefecto = CODIGOS_VALIDOS.has(respuesta?.entornoPorDefecto) ? respuesta.entornoPorDefecto : ENTORNO_PRODUCCION
  return { entornos, entornoPorDefecto: porDefecto }
}

/** El selector solo aparece si el usuario tiene más de un entorno disponible (es decir, si está autorizado a Sandbox). */
export function puedeElegirEntorno(config) {
  return (config?.entornos?.length ?? 0) > 1
}

/** Entorno preseleccionado: el que indica el backend (siempre Producción por defecto) si el usuario lo tiene. */
export function entornoInicial(config) {
  const entornos = config?.entornos ?? []
  if (entornos.some((e) => e.codigo === config.entornoPorDefecto)) return config.entornoPorDefecto
  return entornos[0]?.codigo ?? ENTORNO_PRODUCCION
}

/**
 * Public Key a usar en MercadoPago.js para un entorno. Producción NUNCA usa una clave de respaldo: si el backend no
 * la entrega, no se puede pagar (así no se inicializa el SDK productivo con una clave de prueba). Para Sandbox se
 * acepta la clave heredada (VITE_MERCADOPAGO_PUBLIC_KEY) cuando el backend aún no tiene la suya.
 */
export function publicKeyDe(config, codigo, { respaldoSandbox = '' } = {}) {
  const entorno = (config?.entornos ?? []).find((e) => e.codigo === codigo)
  if (entorno?.publicKey) return entorno.publicKey
  if (codigo === ENTORNO_SANDBOX && entorno && respaldoSandbox.trim()) return respaldoSandbox.trim()
  return ''
}

/** ¿Se puede pagar en este entorno? El backend debe tenerlo configurado y debe existir una Public Key utilizable. */
export function entornoUtilizable(config, codigo, opciones) {
  const entorno = (config?.entornos ?? []).find((e) => e.codigo === codigo)
  return Boolean(entorno?.disponible) && publicKeyDe(config, codigo, opciones) !== ''
}
