// Carga de MercadoPago.js v2 (SDK oficial) e inicialización con la Public Key.
// La Public Key es pública por diseño; el Access Token NUNCA debe estar en el frontend.

const URL_SDK = 'https://sdk.mercadopago.com/js/v2'

export const PUBLIC_KEY_MERCADOPAGO = (import.meta.env?.VITE_MERCADOPAGO_PUBLIC_KEY ?? '').trim()
/** Sandbox: habilita los datos de prueba oficiales en la interfaz (p. ej. celulares de Yape 11111111x). */
export const MODO_SANDBOX = String(import.meta.env?.VITE_MERCADOPAGO_SANDBOX ?? 'true') === 'true'

let promesaSdk = null
let instancia = null

function cargarScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Sin navegador'))
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago)
  if (promesaSdk) return promesaSdk
  promesaSdk = new Promise((resolver, rechazar) => {
    const existente = document.querySelector(`script[src="${URL_SDK}"]`)
    const script = existente ?? document.createElement('script')
    const fallo = () => {
      promesaSdk = null
      script.remove()
      rechazar(new Error('No se pudo cargar Mercado Pago. Revisa tu conexión e inténtalo de nuevo.'))
    }
    script.addEventListener('load', () => (window.MercadoPago ? resolver(window.MercadoPago) : fallo()))
    script.addEventListener('error', fallo)
    if (!existente) {
      script.src = URL_SDK
      script.async = true
      document.body.appendChild(script)
    }
  })
  return promesaSdk
}

/** Instancia única de MercadoPago (locale es-PE). */
export async function obtenerMercadoPago() {
  if (!PUBLIC_KEY_MERCADOPAGO) {
    throw new Error('Falta configurar VITE_MERCADOPAGO_PUBLIC_KEY en el frontend.')
  }
  if (instancia) return instancia
  const MercadoPago = await cargarScript()
  instancia = new MercadoPago(PUBLIC_KEY_MERCADOPAGO, { locale: 'es-PE' })
  return instancia
}

/** Token de un solo uso de Yape a partir del celular y el código de aprobación (OTP). */
export async function crearTokenYape({ celular, codigoAprobacion }) {
  const mp = await obtenerMercadoPago()
  const yape = mp.yape({ otp: codigoAprobacion, phoneNumber: celular })
  const token = await yape.create()
  if (!token?.id) throw new Error('Yape no devolvió un token válido. Genera un nuevo código e inténtalo otra vez.')
  return token.id
}
