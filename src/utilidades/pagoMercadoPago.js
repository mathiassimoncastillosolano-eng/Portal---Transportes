/**
 * Reglas del formulario de pago con Mercado Pago (Checkout API vía Orders, Perú).
 *
 * Tarjetas: los datos de la tarjeta los captura el Card Payment Brick oficial (campos seguros de Mercado
 * Pago); este código solo recibe el token de un solo uso. Yape: el celular y el código de aprobación se
 * convierten en token con MercadoPago.js. En ningún caso el número de tarjeta, el CVV o el código de Yape
 * llegan al backend de RutaLibre, y el importe NUNCA viaja desde el navegador: lo calcula el servidor.
 */

/** Tope por operación de Yape (S/ 500, 900 o 2000 según la configuración del pagador en su app). */
export const TOPE_MAXIMO_YAPE = 2000

export const VALORES_YAPE_INICIALES = { celular: '', codigoAprobacion: '', correo: '' }

/** Celulares de prueba oficiales de Yape para Sandbox (OTP 123456). */
export const CELULARES_PRUEBA_YAPE = [
  { numero: '111111111', resultado: 'Aprobado' },
  { numero: '111111112', resultado: 'Rechazado: requiere autorización' },
  { numero: '111111113', resultado: 'Rechazado: fondos insuficientes' },
  { numero: '111111114', resultado: 'Rechazado: error de procesamiento' },
]

/** Tarjetas de prueba oficiales de Mercado Pago Perú (vencimiento 11/30). */
export const TARJETAS_PRUEBA = [
  { marca: 'Mastercard (crédito)', numero: '5031 7557 3453 0604', cvv: '123' },
  { marca: 'Visa (crédito)', numero: '4009 1753 3280 6176', cvv: '123' },
  { marca: 'American Express (crédito)', numero: '3711 803032 57522', cvv: '1234' },
  { marca: 'Mastercard (débito)', numero: '5178 7816 2220 2455', cvv: '123' },
]

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function soloDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '')
}

export function validarPagoYape(valores, { sandbox = false } = {}) {
  const errores = {}
  const celularValido = /^9\d{8}$/.test(valores.celular) || (sandbox && /^11111111\d$/.test(valores.celular))
  if (!valores.celular) errores.celular = 'Ingresa el celular afiliado a Yape.'
  else if (!celularValido) errores.celular = 'Ingresa un celular válido (9 dígitos).'

  if (!valores.codigoAprobacion) errores.codigoAprobacion = 'Ingresa el código de aprobación.'
  else if (!/^\d{6}$/.test(valores.codigoAprobacion)) errores.codigoAprobacion = 'El código tiene 6 dígitos.'

  if (!valores.correo?.trim()) errores.correo = 'Ingresa tu correo para enviarte el comprobante.'
  else if (!PATRON_CORREO.test(valores.correo.trim())) errores.correo = 'Ingresa un correo válido.'
  return errores
}

/**
 * credit_card | debit_card. El Brick informa paymentTypeId en sus datos adicionales; si no está disponible,
 * los medios de débito de Perú se reconocen por su id (debvisa, debmaster...).
 */
export function tipoDePagoTarjeta(idMetodo, datosAdicionales) {
  const informado = datosAdicionales?.paymentTypeId
  if (['credit_card', 'debit_card', 'prepaid_card'].includes(informado)) return informado
  return /^deb/.test(idMetodo ?? '') ? 'debit_card' : 'credit_card'
}

/** Cuerpo de POST /api/pagos para tarjeta, a partir de getFormData() del Card Payment Brick. Sin importe. */
export function construirSolicitudPagoTarjeta({ idViaje, tokenSesion, claveIdempotencia, datosTarjeta, datosAdicionales }) {
  const identificacion = datosTarjeta?.payer?.identification ?? {}
  return {
    idViaje,
    tokenSesion,
    claveIdempotencia,
    medioPago: 'TARJETA',
    token: datosTarjeta.token,
    metodoPagoId: datosTarjeta.payment_method_id,
    tipoPago: tipoDePagoTarjeta(datosTarjeta.payment_method_id, datosAdicionales),
    cuotas: Number(datosTarjeta.installments) || 1,
    emailPagador: (datosTarjeta?.payer?.email ?? '').trim(),
    tipoDocumento: identificacion.type || null,
    numeroDocumento: identificacion.number ? String(identificacion.number).trim() : null,
  }
}

/** Cuerpo de POST /api/pagos para Yape. Sin importe ni código de aprobación (solo el token). */
export function construirSolicitudPagoYape({ idViaje, tokenSesion, claveIdempotencia, token, valores }) {
  return {
    idViaje,
    tokenSesion,
    claveIdempotencia,
    medioPago: 'YAPE',
    token,
    cuotas: 1,
    emailPagador: valores.correo.trim(),
    celular: valores.celular,
  }
}

/**
 * Traduce el estado verificado por el backend a lo que muestra la interfaz.
 * fase: procesando | accion | aprobado | rechazado | pendiente | reembolso
 */
export function describirEstadoPago(respuesta, { agotado = false } = {}) {
  const estado = respuesta?.estado
  switch (estado) {
    case 'APROBADO':
      return { fase: 'aprobado', titulo: '¡Pago aprobado!', texto: respuesta.mensaje }
    case 'RECHAZADO':
      return { fase: 'rechazado', titulo: 'El pago no fue aprobado', texto: respuesta.mensaje }
    case 'ERROR':
      return { fase: 'rechazado', titulo: 'No pudimos procesar el pago', texto: respuesta.mensaje }
    case 'EXPIRADO':
      return { fase: 'rechazado', titulo: 'El tiempo para pagar terminó', texto: respuesta.mensaje }
    case 'APROBADO_SIN_ASIENTOS':
    case 'REEMBOLSADO':
      return { fase: 'reembolso', titulo: 'Tus asientos ya no estaban disponibles', texto: respuesta.mensaje }
    case 'ACCION_REQUERIDA':
      return { fase: 'accion', titulo: 'Verificación de tu banco', texto: respuesta.mensaje }
    case 'CREANDO':
    case 'EN_PROCESO':
      return agotado
        ? {
            fase: 'pendiente',
            titulo: 'Tu pago está en revisión',
            texto:
              'Todavía no tenemos la confirmación de Mercado Pago. No vuelvas a pagar: tus asientos siguen reservados ' +
              'mientras se resuelve y verás el resultado aquí o en "Mis pasajes".',
          }
        : { fase: 'procesando', titulo: 'Estamos procesando tu pago', texto: respuesta?.mensaje }
    default:
      return { fase: 'procesando', titulo: 'Estamos procesando tu pago', texto: null }
  }
}
