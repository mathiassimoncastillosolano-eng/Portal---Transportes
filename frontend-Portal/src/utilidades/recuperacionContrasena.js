// Reglas y estado del flujo de recuperación de contraseña (sin dependencias de React,
// para poder probarlo con `node --test`). El backend vuelve a validar todo.

export const LONGITUD_CODIGO = 6
export const MINIMO_CONTRASENA = 8
export const MAXIMO_BYTES_CONTRASENA = 72 // límite de BCrypt, igual que el registro

const FORMATO_CORREO = /^\S+@\S+\.\S+$/

/** Devuelve un mensaje de error o '' si el correo es válido. */
export function validarCorreoRecuperacion(correo) {
  const limpio = (correo ?? '').trim()
  if (!limpio) return 'Ingresa tu correo electrónico.'
  if (!FORMATO_CORREO.test(limpio) || limpio.length > 150) return 'Ingresa un correo válido (máximo 150 caracteres).'
  return ''
}

/** Oculta parte del correo: "maxty@gmail.com" -> "m***y@gmail.com". */
export function ocultarCorreo(correo) {
  const limpio = (correo ?? '').trim()
  const arroba = limpio.lastIndexOf('@')
  if (arroba < 1) return limpio
  const usuario = limpio.slice(0, arroba)
  const dominio = limpio.slice(arroba)
  if (usuario.length <= 2) return `${usuario[0]}***${dominio}`
  return `${usuario[0]}***${usuario[usuario.length - 1]}${dominio}`
}

/** Conserva solo los dígitos y recorta a la longitud del código (sirve al escribir y al pegar). */
export function normalizarCodigo(texto) {
  return String(texto ?? '').replace(/\D/g, '').slice(0, LONGITUD_CODIGO)
}

/** Requisitos que se muestran mientras se escribe la nueva contraseña. */
export function evaluarContrasenaNueva(contrasena, confirmacion) {
  const bytes = new TextEncoder().encode(contrasena).length
  const requisitos = [
    { id: 'longitud', texto: `Al menos ${MINIMO_CONTRASENA} caracteres`, cumple: contrasena.length >= MINIMO_CONTRASENA },
    { id: 'limite', texto: `Máximo ${MAXIMO_BYTES_CONTRASENA} bytes (evita contraseñas excesivamente largas)`, cumple: bytes <= MAXIMO_BYTES_CONTRASENA },
    { id: 'coincide', texto: 'Las dos contraseñas coinciden', cumple: contrasena.length > 0 && contrasena === confirmacion },
  ]
  return { requisitos, valida: requisitos.every((r) => r.cumple) }
}

/** Mensajes por campo para mostrar tras intentar enviar. */
export function erroresContrasenaNueva(contrasena, confirmacion) {
  const errores = {}
  if (!contrasena.trim()) errores.contrasena = 'Ingresa la nueva contraseña.'
  else if (contrasena.length < MINIMO_CONTRASENA) errores.contrasena = `La contraseña debe tener al menos ${MINIMO_CONTRASENA} caracteres.`
  else if (new TextEncoder().encode(contrasena).length > MAXIMO_BYTES_CONTRASENA) errores.contrasena = 'La contraseña es demasiado larga; utiliza menos caracteres.'
  if (!confirmacion) errores.confirmacion = 'Confirma la nueva contraseña.'
  else if (confirmacion !== contrasena) errores.confirmacion = 'Las contraseñas no coinciden.'
  return errores
}

// ---------------------------------------------------------------- máquina de estados

export const PASOS = { METODO: 'metodo', CORREO: 'correo', CODIGO: 'codigo', NUEVA: 'nueva', EXITO: 'exito' }

export const ESTADO_INICIAL = { paso: PASOS.METODO, correo: '', prueba: null, reenvioEn: 60, aviso: '' }

/**
 * Transiciones permitidas. Cualquier evento fuera de orden se ignora, de modo que no se
 * pueda llegar a "nueva contraseña" sin una prueba entregada por el backend.
 * Desde NUEVA no hay vuelta atrás: el código ya se consumió al verificarlo.
 */
export function reducirRecuperacion(estado, evento) {
  switch (evento.tipo) {
    case 'ELEGIR_METODO':
      return estado.paso === PASOS.METODO ? { ...estado, paso: PASOS.CORREO, aviso: '' } : estado
    case 'CODIGO_ENVIADO':
      return estado.paso === PASOS.CORREO
        ? { ...estado, paso: PASOS.CODIGO, correo: evento.correo, reenvioEn: evento.reenvioEn ?? 60, aviso: '' }
        : estado
    case 'VOLVER':
      if (estado.paso === PASOS.CODIGO) return { ...estado, paso: PASOS.CORREO, prueba: null, aviso: '' }
      if (estado.paso === PASOS.CORREO) return { ...estado, paso: PASOS.METODO, aviso: '' }
      return estado
    case 'CODIGO_VERIFICADO':
      return estado.paso === PASOS.CODIGO && typeof evento.prueba === 'string' && evento.prueba
        ? { ...estado, paso: PASOS.NUEVA, prueba: evento.prueba }
        : estado
    case 'VERIFICACION_PERDIDA': // la prueba venció o ya se usó: se reinicia desde el correo
      return estado.paso === PASOS.NUEVA
        ? { ...estado, paso: PASOS.CORREO, prueba: null, aviso: evento.aviso ?? '' }
        : estado
    case 'CONTRASENA_CAMBIADA':
      return estado.paso === PASOS.NUEVA ? { ...estado, paso: PASOS.EXITO, prueba: null } : estado
    case 'REINICIAR':
      return ESTADO_INICIAL
    default:
      return estado
  }
}
