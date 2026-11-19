export const VALORES_YAPE_INICIALES = { celular: '', codigoAprobacion: '', correo: '', dni: '' }

export const CELULARES_PRUEBA_YAPE = [
  { numero: '111111111', resultado: 'Aprobado' },
  { numero: '111111112', resultado: 'Rechazado' },
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

  if (valores.dni && !/^\d{8}$/.test(valores.dni)) errores.dni = 'El DNI tiene 8 dígitos.'
  return errores
}
