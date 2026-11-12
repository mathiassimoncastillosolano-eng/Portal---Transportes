export const TIPOS_DOCUMENTO = [
  { valor: 'DNI', texto: 'DNI' },
  { valor: 'CE', texto: 'Carné de extranjería' },
  { valor: 'PASAPORTE', texto: 'Pasaporte' },
]

export const SERVICIOS = [
  'Transporte terrestre de pasajeros',
  'Compra de pasajes en línea',
  'Equipaje o encomienda',
  'Atención al cliente',
  'Otro',
]

export const PASOS = ['Tus datos', 'Servicio', 'Reclamación', 'Revisión']

export const LIMITES = {
  descripcion: { min: 3, max: 300 },
  detalle: { min: 20, max: 2000 },
  pedido: { min: 10, max: 1000 },
}

const REGEX_CORREO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/
const REGEX_NOMBRE = /^\p{L}[\p{L} .'’-]{2,199}$/u
const REGEX_TELEFONO = /^\+?[0-9][0-9 ()-]{5,18}[0-9]$/
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/

export function crearFormularioInicial() {
  return {
    nombresCompletos: '',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    domicilio: '',
    telefono: '',
    correo: '',
    servicioInvolucrado: SERVICIOS[0],
    idPasaje: '',
    codigoViaje: '',
    origen: '',
    destino: '',
    fechaServicio: '',
    numeroAsiento: '',
    tipoRequerimiento: '',
    descripcionServicio: '',
    fechaIncidente: '',
    montoReclamado: '',
    moneda: 'PEN',
    detalleHechos: '',
    pedidoConsumidor: '',
    declaracionVeracidad: false,
    autorizaTratamientoDatos: false,
  }
}

export function fechaIsoLocal(fecha = new Date()) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

export function normalizarDocumento(valor) {
  return String(valor ?? '').replace(/\s+/g, '').toUpperCase()
}

export function validarDocumento(tipo, numero) {
  const limpio = normalizarDocumento(numero)
  if (!limpio) return 'Ingresa tu número de documento.'
  if (tipo === 'DNI') return /^\d{8}$/.test(limpio) ? null : 'El DNI debe tener 8 dígitos.'
  if (tipo === 'CE') {
    return /^[A-Z0-9]{9,12}$/.test(limpio) ? null : 'El carné de extranjería debe tener entre 9 y 12 caracteres alfanuméricos.'
  }
  return /^[A-Z0-9]{6,12}$/.test(limpio) ? null : 'El pasaporte debe tener entre 6 y 12 caracteres alfanuméricos.'
}

function largoLimpio(valor) {
  return String(valor ?? '').trim().length
}

function fechaValida(valor) {
  if (!REGEX_FECHA.test(valor)) return false
  const fecha = new Date(`${valor}T00:00:00`)
  return !Number.isNaN(fecha.getTime()) && fechaIsoLocal(fecha) === valor
}

function sumarAnios(fechaIso, anios) {
  const [a, m, d] = fechaIso.split('-').map(Number)
  return fechaIsoLocal(new Date(a + anios, m - 1, d))
}

export function validarPaso(paso, f, hoy = fechaIsoLocal()) {
  const errores = {}

  if (paso === 0) {
    const nombres = f.nombresCompletos.trim()
    if (!nombres) errores.nombresCompletos = 'Ingresa tus nombres y apellidos completos.'
    else if (!REGEX_NOMBRE.test(nombres)) errores.nombresCompletos = 'Usa solo letras, espacios, puntos, guiones o apóstrofes.'

    const errorDocumento = validarDocumento(f.tipoDocumento, f.numeroDocumento)
    if (errorDocumento) errores.numeroDocumento = errorDocumento

    if (largoLimpio(f.domicilio) < 5) errores.domicilio = 'Ingresa tu domicilio (mínimo 5 caracteres).'
    else if (largoLimpio(f.domicilio) > 250) errores.domicilio = 'El domicilio no puede superar los 250 caracteres.'

    const telefono = f.telefono.trim()
    if (!telefono) errores.telefono = 'Ingresa tu teléfono de contacto.'
    else if (!REGEX_TELEFONO.test(telefono)) errores.telefono = 'Ingresa un teléfono válido, por ejemplo 987654321.'

    const correo = f.correo.trim()
    if (!correo) errores.correo = 'Ingresa tu correo electrónico.'
    else if (!REGEX_CORREO.test(correo) || correo.length > 150) errores.correo = 'Ingresa un correo válido, por ejemplo nombre@correo.com.'
  }

  if (paso === 1) {
    if (!f.servicioInvolucrado) errores.servicioInvolucrado = 'Selecciona el servicio involucrado.'
    if (f.fechaServicio) {
      if (!fechaValida(f.fechaServicio)) errores.fechaServicio = 'Ingresa una fecha válida.'
      else if (f.fechaServicio < sumarAnios(hoy, -5)) errores.fechaServicio = 'La fecha del servicio es demasiado antigua.'
      else if (f.fechaServicio > sumarAnios(hoy, 1)) errores.fechaServicio = 'La fecha del servicio no es válida.'
    }
    if (f.origen.length > 100) errores.origen = 'Máximo 100 caracteres.'
    if (f.destino.length > 100) errores.destino = 'Máximo 100 caracteres.'
    if (f.numeroAsiento.length > 10) errores.numeroAsiento = 'Máximo 10 caracteres.'
    if (f.codigoViaje.length > 30) errores.codigoViaje = 'Máximo 30 caracteres.'
  }

  if (paso === 2) {
    if (!f.tipoRequerimiento) errores.tipoRequerimiento = 'Selecciona si presentas un reclamo o una queja.'

    const descripcion = largoLimpio(f.descripcionServicio)
    if (descripcion < LIMITES.descripcion.min) errores.descripcionServicio = 'Describe brevemente el servicio involucrado.'
    else if (descripcion > LIMITES.descripcion.max) errores.descripcionServicio = `Máximo ${LIMITES.descripcion.max} caracteres.`

    if (!f.fechaIncidente) errores.fechaIncidente = 'Indica la fecha en que ocurrió el incidente.'
    else if (!fechaValida(f.fechaIncidente)) errores.fechaIncidente = 'Ingresa una fecha válida.'
    else if (f.fechaIncidente > hoy) errores.fechaIncidente = 'La fecha del incidente no puede ser futura.'
    else if (f.fechaIncidente < sumarAnios(hoy, -5)) errores.fechaIncidente = 'La fecha del incidente es demasiado antigua.'

    if (String(f.montoReclamado).trim() !== '') {
      const monto = Number(String(f.montoReclamado).replace(',', '.'))
      if (!Number.isFinite(monto) || monto < 0) errores.montoReclamado = 'Ingresa un monto válido.'
      else if (monto > 99999999.99) errores.montoReclamado = 'El monto es demasiado alto.'
      else if (!/^\d+([.,]\d{1,2})?$/.test(String(f.montoReclamado).trim())) errores.montoReclamado = 'Usa como máximo dos decimales.'
    }

    const detalle = largoLimpio(f.detalleHechos)
    if (detalle < LIMITES.detalle.min) errores.detalleHechos = `Cuéntanos qué ocurrió (mínimo ${LIMITES.detalle.min} caracteres).`
    else if (detalle > LIMITES.detalle.max) errores.detalleHechos = `Máximo ${LIMITES.detalle.max} caracteres.`

    const pedido = largoLimpio(f.pedidoConsumidor)
    if (pedido < LIMITES.pedido.min) errores.pedidoConsumidor = `Indica qué solución esperas (mínimo ${LIMITES.pedido.min} caracteres).`
    else if (pedido > LIMITES.pedido.max) errores.pedidoConsumidor = `Máximo ${LIMITES.pedido.max} caracteres.`
  }

  if (paso === 3) {
    if (!f.declaracionVeracidad) errores.declaracionVeracidad = 'Debes declarar que la información es veraz.'
    if (!f.autorizaTratamientoDatos) errores.autorizaTratamientoDatos = 'Debes aceptar el tratamiento de tus datos personales.'
  }

  return errores
}

export function validarTodo(f, hoy = fechaIsoLocal()) {
  for (let paso = 0; paso < PASOS.length; paso += 1) {
    const errores = validarPaso(paso, f, hoy)
    if (Object.keys(errores).length > 0) return { paso, errores }
  }
  return null
}

function opcional(valor) {
  const limpio = String(valor ?? '').trim()
  return limpio === '' ? null : limpio
}

export function construirPayload(f, claveIdempotencia) {
  const conPasaje = f.idPasaje !== '' && f.idPasaje !== null && f.idPasaje !== undefined
  const monto = String(f.montoReclamado).trim()
  return {
    claveIdempotencia,
    nombresCompletos: f.nombresCompletos.trim(),
    tipoDocumento: f.tipoDocumento,
    numeroDocumento: normalizarDocumento(f.numeroDocumento),
    domicilio: f.domicilio.trim(),
    telefono: f.telefono.trim(),
    correo: f.correo.trim().toLowerCase(),
    servicioInvolucrado: f.servicioInvolucrado,
    idPasaje: conPasaje ? Number(f.idPasaje) : null,
    codigoViaje: conPasaje ? null : opcional(f.codigoViaje),
    origen: conPasaje ? null : opcional(f.origen),
    destino: conPasaje ? null : opcional(f.destino),
    fechaServicio: conPasaje ? null : opcional(f.fechaServicio),
    numeroAsiento: conPasaje ? null : opcional(f.numeroAsiento),
    tipoRequerimiento: f.tipoRequerimiento,
    descripcionServicio: f.descripcionServicio.trim(),
    fechaIncidente: f.fechaIncidente,
    montoReclamado: monto === '' ? null : Number(monto.replace(',', '.')),
    moneda: f.moneda,
    detalleHechos: f.detalleHechos.trim(),
    pedidoConsumidor: f.pedidoConsumidor.trim(),
    declaracionVeracidad: f.declaracionVeracidad,
    autorizaTratamientoDatos: f.autorizaTratamientoDatos,
  }
}
