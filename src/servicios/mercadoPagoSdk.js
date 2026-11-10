// Carga de MercadoPago.js v2 (SDK oficial) e inicialización con la Public Key.
// La Public Key es pública por diseño; el Access Token NUNCA debe estar en el frontend.

import { esperarDeviceId, leerDeviceId } from '../utilidades/pagoMercadoPago'

const URL_SDK = 'https://sdk.mercadopago.com/js/v2'
const URL_SEGURIDAD = 'https://www.mercadopago.com/v2/security.js'

/**
 * Public Key de PRUEBA heredada (variable de Vercel anterior a los entornos). Solo sirve como respaldo para Sandbox
 * mientras el backend no entregue la suya (MERCADOPAGO_SANDBOX_PUBLIC_KEY). Producción nunca la usa.
 */
export const PUBLIC_KEY_SANDBOX_RESPALDO = (import.meta.env?.VITE_MERCADOPAGO_PUBLIC_KEY ?? '').trim()

let promesaSdk = null
// Una instancia por Public Key: Sandbox y Producción usan claves distintas y nunca comparten instancia.
const instancias = new Map()

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

function cargarSeguridad() {
  if (typeof document === 'undefined') return
  if (document.querySelector(`script[src="${URL_SEGURIDAD}"]`)) return
  const script = document.createElement('script')
  script.src = URL_SEGURIDAD
  script.async = true
  script.setAttribute('view', 'checkout')
  document.body.appendChild(script)
}

export async function asegurarDeviceId() {
  const desdeSdk = await esperarDeviceId({ maxEsperaMs: 3000 })
  if (desdeSdk) return desdeSdk
  cargarSeguridad()
  return esperarDeviceId({ maxEsperaMs: 3000 })
}

/** Instancia de MercadoPago (locale es-PE) para la Public Key del entorno elegido. */
export async function obtenerMercadoPago(publicKey) {
  const clave = (publicKey ?? '').trim()
  if (!clave) {
    throw new Error('Falta la Public Key de Mercado Pago para este entorno. Avisa al administrador.')
  }
  if (instancias.has(clave)) return instancias.get(clave)
  const MercadoPago = await cargarScript()
  const instancia = new MercadoPago(clave, { locale: 'es-PE' })
  instancias.set(clave, instancia)
  setTimeout(() => {
    if (!leerDeviceId()) cargarSeguridad()
  }, 2000)
  return instancia
}

/** Token de un solo uso de Yape a partir del celular y el código de aprobación (OTP). */
export async function crearTokenYape({ celular, codigoAprobacion, publicKey }) {
  const mp = await obtenerMercadoPago(publicKey)
  const yape = mp.yape({ otp: codigoAprobacion, phoneNumber: celular })
  const token = await yape.create()
  if (!token?.id) throw new Error('Yape no devolvió un token válido. Genera un nuevo código e inténtalo otra vez.')
  return token.id
}