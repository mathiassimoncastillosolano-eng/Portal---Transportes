export const TARJETAS_PRUEBA = [
  { marca: 'Visa', numero: '4111 1111 1111 1111' },
  { marca: 'Mastercard', numero: '5111 1111 1111 1118' },
]

export const DATOS_PRUEBA = { cvv: '123', vencimiento: '09/30', correo: 'review@culqi.com' }

export const YAPE_PRUEBA = { celular: '900 000 001', codigo: 'cualquier código de 6 dígitos' }

export function tipoMedioPago(tokenId) {
  return String(tokenId ?? '').startsWith('ype_') ? 'YAPE' : 'TARJETA'
}

export function construirSolicitudPago({ idViaje, tokenSesion, claveIdempotencia, token, correo }) {
  return {
    idViaje,
    tokenSesion,
    claveIdempotencia,
    medioPago: tipoMedioPago(token.id),
    token: token.id,
    emailPagador: (token.email || correo || '').trim(),
    aceptaTerminos: true,
  }
}

export function describirEstadoPago(respuesta, { agotado = false } = {}) {
  switch (respuesta?.estado) {
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
              'Todavía no tenemos la confirmación de Culqi. No vuelvas a pagar: tus asientos siguen reservados ' +
              'mientras se resuelve y verás el resultado aquí o en "Mis pasajes".',
          }
        : { fase: 'procesando', titulo: 'Estamos procesando tu pago', texto: respuesta?.mensaje }
    default:
      return { fase: 'procesando', titulo: 'Estamos procesando tu pago', texto: null }
  }
}
