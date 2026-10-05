/**
 * Reglas del formulario de pago alineadas con Checkout API de Mercado Pago
 * (Perú). Aquí vive todo lo que no es interfaz: detección de marca por BIN,
 * validaciones, la simulación de respuestas del sandbox y la forma exacta
 * del cuerpo que el endpoint de pago (T-33) recibirá.
 *
 * Importante: el formulario NUNCA envía el número de tarjeta ni el CVV al
 * backend. En la integración real, el SDK de Mercado Pago (MercadoPago.js)
 * convierte esos datos en un `token` de un solo uso, y solo ese token viaja
 * a nuestro servidor. En modo demo usamos un token ficticio.
 */

export const MARCAS_TARJETA = {
  visa: { id: 'visa', nombre: 'Visa', longitudes: [16], longitudCvv: 3, grupos: [4, 4, 4, 4] },
  master: { id: 'master', nombre: 'Mastercard', longitudes: [16], longitudCvv: 3, grupos: [4, 4, 4, 4] },
  amex: { id: 'amex', nombre: 'American Express', longitudes: [15], longitudCvv: 4, grupos: [4, 6, 5] },
  diners: { id: 'diners', nombre: 'Diners Club', longitudes: [14], longitudCvv: 3, grupos: [4, 6, 4] },
}

/** Tipos de documento que Mercado Pago acepta para pagadores en Perú. */
export const TIPOS_DOCUMENTO = [
  { id: 'DNI', nombre: 'DNI', patron: /^\d{8}$/, ayuda: '8 dígitos' },
  { id: 'C.E', nombre: 'Carné de extranjería', patron: /^[A-Za-z0-9]{9,12}$/, ayuda: '9 a 12 caracteres' },
  { id: 'RUC', nombre: 'RUC', patron: /^\d{11}$/, ayuda: '11 dígitos' },
  { id: 'Otro', nombre: 'Otro', patron: /^[A-Za-z0-9]{5,20}$/, ayuda: '5 a 20 caracteres' },
]

export const CUOTAS_DISPONIBLES = [1, 3, 6, 12]

export const VALORES_TARJETA_INICIALES = {
  numeroTarjeta: '',
  titular: '',
  vencimiento: '',
  cvv: '',
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  correo: '',
  cuotas: 1,
}

export const VALORES_YAPE_INICIALES = { celular: '', codigoAprobacion: '', correo: '' }

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function soloDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '')
}

/**
 * Detecta la marca con los primeros dígitos (BIN). En la integración real
 * esto lo resuelve `mp.getPaymentMethods({ bin })`; aquí es una aproximación
 * que incluye el prefijo 50, usado por la Mastercard de prueba de Mercado Pago.
 */
export function detectarMarca(numero) {
  const digitos = soloDigitos(numero)
  if (/^4/.test(digitos)) return MARCAS_TARJETA.visa
  if (/^(5[0-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digitos)) return MARCAS_TARJETA.master
  if (/^3[47]/.test(digitos)) return MARCAS_TARJETA.amex
  if (/^3(0[0-5]|[689])/.test(digitos)) return MARCAS_TARJETA.diners
  return null
}

/** Algoritmo de Luhn: descarta números mal tipeados antes de tokenizar. */
export function pasaLuhn(numero) {
  const digitos = soloDigitos(numero)
  if (!digitos) return false
  let suma = 0
  for (let indice = 0; indice < digitos.length; indice += 1) {
    let digito = Number(digitos[digitos.length - 1 - indice])
    if (indice % 2 === 1) {
      digito *= 2
      if (digito > 9) digito -= 9
    }
    suma += digito
  }
  return suma % 10 === 0
}

export function formatearNumeroTarjeta(valor) {
  const marca = detectarMarca(valor)
  const grupos = marca?.grupos ?? [4, 4, 4, 4]
  const maximo = marca ? Math.max(...marca.longitudes) : 16
  const digitos = soloDigitos(valor).slice(0, maximo)

  const partes = []
  let inicio = 0
  for (const tamano of grupos) {
    if (inicio >= digitos.length) break
    partes.push(digitos.slice(inicio, inicio + tamano))
    inicio += tamano
  }
  return partes.join(' ')
}

export function formatearVencimiento(valor) {
  const digitos = soloDigitos(valor).slice(0, 4)
  if (digitos.length <= 2) return digitos
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`
}

/** "MM/AA" → { mes: 11, anio: 2030 } (los campos que pide el SDK). */
export function separarVencimiento(vencimiento) {
  const coincidencia = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(vencimiento ?? '')
  if (!coincidencia) return null
  return { mes: Number(coincidencia[1]), anio: 2000 + Number(coincidencia[2]) }
}

export function validarPagoTarjeta(valores, hoy = new Date()) {
  const errores = {}
  const marca = detectarMarca(valores.numeroTarjeta)
  const digitos = soloDigitos(valores.numeroTarjeta)

  if (!digitos) errores.numeroTarjeta = 'Ingresa el número de tarjeta.'
  else if (!marca) errores.numeroTarjeta = 'Aceptamos Visa, Mastercard, American Express y Diners Club.'
  else if (!marca.longitudes.includes(digitos.length)) {
    errores.numeroTarjeta = `Una tarjeta ${marca.nombre} tiene ${marca.longitudes.join(' o ')} dígitos.`
  } else if (!pasaLuhn(digitos)) errores.numeroTarjeta = 'Revisa el número, parece tener un error.'

  if (!valores.titular.trim()) errores.titular = 'Ingresa el nombre como figura en la tarjeta.'
  else if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]{2,}$/.test(valores.titular.trim())) {
    errores.titular = 'Usa solo letras y espacios.'
  }

  const vencimiento = separarVencimiento(valores.vencimiento)
  if (!valores.vencimiento) errores.vencimiento = 'Ingresa el vencimiento.'
  else if (!vencimiento) errores.vencimiento = 'Usa el formato MM/AA.'
  else {
    const mesActual = hoy.getFullYear() * 12 + hoy.getMonth()
    const mesTarjeta = vencimiento.anio * 12 + (vencimiento.mes - 1)
    if (mesTarjeta < mesActual) errores.vencimiento = 'La tarjeta está vencida.'
  }

  const longitudCvv = marca?.longitudCvv ?? 3
  if (!valores.cvv) errores.cvv = 'Ingresa el código de seguridad.'
  else if (soloDigitos(valores.cvv).length !== longitudCvv || !/^\d+$/.test(valores.cvv)) {
    errores.cvv = `Debe tener ${longitudCvv} dígitos.`
  }

  const tipoDocumento = TIPOS_DOCUMENTO.find((tipo) => tipo.id === valores.tipoDocumento)
  if (!tipoDocumento) errores.tipoDocumento = 'Selecciona el tipo de documento.'
  if (!valores.numeroDocumento.trim()) errores.numeroDocumento = 'Ingresa el número de documento.'
  else if (tipoDocumento && !tipoDocumento.patron.test(valores.numeroDocumento.trim())) {
    errores.numeroDocumento = `El ${tipoDocumento.nombre} debe tener ${tipoDocumento.ayuda}.`
  }

  validarCorreo(valores.correo, errores)

  if (!CUOTAS_DISPONIBLES.includes(Number(valores.cuotas))) errores.cuotas = 'Selecciona las cuotas.'

  return errores
}

export function validarPagoYape(valores) {
  const errores = {}
  if (!valores.celular) errores.celular = 'Ingresa el celular afiliado a Yape.'
  else if (!/^9\d{8}$/.test(valores.celular)) errores.celular = 'Ingresa un celular válido (9 dígitos).'

  if (!valores.codigoAprobacion) errores.codigoAprobacion = 'Ingresa el código de aprobación.'
  else if (!/^\d{6}$/.test(valores.codigoAprobacion)) errores.codigoAprobacion = 'El código tiene 6 dígitos.'

  validarCorreo(valores.correo, errores)
  return errores
}

function validarCorreo(correo, errores) {
  if (!correo?.trim()) errores.correo = 'Ingresa tu correo para enviarte el comprobante.'
  else if (!PATRON_CORREO.test(correo.trim())) errores.correo = 'Ingresa un correo válido.'
}

export function montoPorCuota(total, cuotas) {
  return Math.round((total / cuotas) * 100) / 100
}

/**
 * Cuerpo que el frontend enviará a `POST /api/pagos` (T-33). Usa los mismos
 * nombres de campo que `POST /v1/payments` de Mercado Pago para que el
 * backend solo tenga que agregar su Access Token y reenviarlo.
 *
 * @param {object} parametros
 * @param {'tarjeta'|'yape'} parametros.metodo
 * @param {object} parametros.valores  valores del formulario del método
 * @param {string} parametros.token    token devuelto por MercadoPago.js
 * @param {number} parametros.monto    total en soles
 * @param {string} parametros.descripcion
 * @param {string} parametros.referencia  id de la compra/reserva (T-34)
 */
export function construirSolicitudPago({ metodo, valores, token, monto, descripcion, referencia }) {
  const base = {
    token,
    transaction_amount: Math.round(monto * 100) / 100,
    description: descripcion,
    external_reference: referencia,
  }

  if (metodo === 'yape') {
    return {
      ...base,
      payment_method_id: 'yape',
      installments: 1,
      payer: { email: valores.correo.trim() },
    }
  }

  return {
    ...base,
    payment_method_id: detectarMarca(valores.numeroTarjeta)?.id ?? null,
    issuer_id: null,
    installments: Number(valores.cuotas),
    payer: {
      email: valores.correo.trim(),
      identification: { type: valores.tipoDocumento, number: valores.numeroDocumento.trim() },
    },
  }
}

/**
 * Respuestas del sandbox de Mercado Pago: en pruebas, el nombre del titular
 * decide el resultado (APRO aprueba, FUND rechaza por fondos, etc.).
 * Replicamos ese comportamiento para poder mostrar cada caso en la demo.
 */
const RESPUESTAS_SANDBOX = {
  APRO: { status: 'approved', status_detail: 'accredited' },
  CONT: { status: 'in_process', status_detail: 'pending_contingency' },
  OTHE: { status: 'rejected', status_detail: 'cc_rejected_other_reason' },
  CALL: { status: 'rejected', status_detail: 'cc_rejected_call_for_authorize' },
  FUND: { status: 'rejected', status_detail: 'cc_rejected_insufficient_amount' },
  SECU: { status: 'rejected', status_detail: 'cc_rejected_bad_filled_security_code' },
  EXPI: { status: 'rejected', status_detail: 'cc_rejected_bad_filled_date' },
  FORM: { status: 'rejected', status_detail: 'cc_rejected_bad_filled_other' },
}

export const MENSAJES_ESTADO = {
  accredited: '¡Listo! Tu pago fue aprobado.',
  pending_contingency: 'Estamos procesando tu pago. Te avisaremos por correo cuando se confirme.',
  cc_rejected_other_reason: 'Tu banco rechazó el pago. Intenta con otra tarjeta u otro medio.',
  cc_rejected_call_for_authorize: 'Debes autorizar este pago con tu banco antes de reintentar.',
  cc_rejected_insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
  cc_rejected_bad_filled_security_code: 'El código de seguridad no es correcto.',
  cc_rejected_bad_filled_date: 'La fecha de vencimiento no es correcta.',
  cc_rejected_bad_filled_other: 'Revisa los datos de la tarjeta.',
}

export function simularRespuestaPago(metodo, valores) {
  if (metodo === 'yape') return { status: 'approved', status_detail: 'accredited' }
  const clave = valores.titular.trim().toUpperCase()
  return RESPUESTAS_SANDBOX[clave] ?? { status: 'approved', status_detail: 'accredited' }
}
