import type { DatosPago, MetodoPago } from '@/types/pago'
import type { DatosPasajero, TipoDocumento } from '@/types/pasajero'
import type { PagoForm, PasajeroForm } from '../types'

export type ErroresPasajero = Partial<Record<keyof PasajeroForm, string>>
export type ErroresPago = Partial<Record<'metodoPagoId' | 'montoRecibido' | 'referencia', string>>

export const tiposDocumento: { value: TipoDocumento; label: string }[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
]

const patronDocumento: Record<TipoDocumento, { regex: RegExp; mensaje: string; maxLength: number }> = {
  DNI: { regex: /^\d{8}$/, mensaje: 'El DNI debe tener 8 dígitos.', maxLength: 8 },
  CE: { regex: /^\d{9}$/, mensaje: 'El carné de extranjería debe tener 9 dígitos.', maxLength: 9 },
  PASAPORTE: {
    regex: /^[A-Za-z0-9]{6,12}$/,
    mensaje: 'El pasaporte debe tener entre 6 y 12 letras o números.',
    maxLength: 12,
  },
}

export function longitudMaximaDocumento(tipo: TipoDocumento): number {
  return patronDocumento[tipo].maxLength
}

const REGEX_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,60}$/
const REGEX_TELEFONO = /^9\d{8}$/
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const REGEX_REFERENCIA = /^[A-Za-z0-9-]{6,20}$/

/** Todos los campos son obligatorios salvo el correo. */
export function validarPasajero(f: PasajeroForm): ErroresPasajero {
  const errores: ErroresPasajero = {}
  const doc = f.numeroDocumento.trim()
  if (!doc) errores.numeroDocumento = 'Ingresa el número de documento.'
  else if (!patronDocumento[f.tipoDocumento].regex.test(doc)) {
    errores.numeroDocumento = patronDocumento[f.tipoDocumento].mensaje
  }
  if (!f.nombres.trim()) errores.nombres = 'Ingresa los nombres del pasajero.'
  else if (!REGEX_NOMBRE.test(f.nombres.trim())) errores.nombres = 'Usa solo letras (mínimo 2).'
  if (!f.apellidos.trim()) errores.apellidos = 'Ingresa los apellidos del pasajero.'
  else if (!REGEX_NOMBRE.test(f.apellidos.trim())) errores.apellidos = 'Usa solo letras (mínimo 2).'
  const tel = f.telefono.trim()
  if (!tel) errores.telefono = 'Ingresa un teléfono de contacto.'
  else if (!REGEX_TELEFONO.test(tel)) errores.telefono = 'El celular debe tener 9 dígitos y empezar con 9.'
  if (f.email.trim() && !REGEX_EMAIL.test(f.email.trim())) errores.email = 'Ingresa un correo válido.'
  return errores
}

/** Convierte el texto del formulario en número; `NaN` si no es válido. */
export function parsearMonto(texto: string): number {
  const limpio = texto.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return Number.NaN
  return Number(limpio)
}

/** Efectivo: el monto recibido cubre el total. Pagos digitales: requieren referencia. */
export function validarPago(f: PagoForm, metodo: MetodoPago | undefined, total: number): ErroresPago {
  const errores: ErroresPago = {}
  if (!metodo) {
    errores.metodoPagoId = 'Selecciona un método de pago.'
    return errores
  }
  if (metodo.id === 'efectivo') {
    const recibido = parsearMonto(f.montoRecibido)
    if (!f.montoRecibido.trim()) errores.montoRecibido = 'Ingresa el monto recibido.'
    else if (Number.isNaN(recibido) || recibido <= 0) errores.montoRecibido = 'Ingresa un monto válido (máx. 2 decimales).'
    else if (recibido < total) errores.montoRecibido = 'El monto recibido no cubre el total del pasaje.'
  }
  if (metodo.requiereReferencia) {
    const ref = f.referencia.trim()
    const etiqueta = metodo.etiquetaReferencia ?? 'Código de referencia'
    if (!ref) errores.referencia = `Ingresa el ${etiqueta.toLowerCase()}.`
    else if (!REGEX_REFERENCIA.test(ref)) errores.referencia = 'Usa entre 6 y 20 letras, números o guiones.'
  }
  return errores
}

export function aDatosPasajero(f: PasajeroForm): DatosPasajero {
  const email = f.email.trim()
  return {
    tipoDocumento: f.tipoDocumento,
    numeroDocumento: f.numeroDocumento.trim().toUpperCase(),
    nombres: f.nombres.trim(),
    apellidos: f.apellidos.trim(),
    telefono: f.telefono.trim(),
    email: email || undefined,
  }
}

export function aDatosPago(f: PagoForm, metodo: MetodoPago, total: number): DatosPago {
  return {
    metodoPagoId: metodo.id,
    monto: total,
    montoRecibido: metodo.id === 'efectivo' ? parsearMonto(f.montoRecibido) : undefined,
    referencia: metodo.requiereReferencia ? f.referencia.trim() : undefined,
  }
}

/** Lleva el foco al primer campo con error (patrón de formularios del sistema). */
export function enfocarPrimerError(ids: string[]) {
  window.requestAnimationFrame(() => {
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) {
        el.focus()
        return
      }
    }
  })
}
