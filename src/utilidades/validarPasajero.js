// Validación de los datos de un pasajero. Es el ESPEJO de ValidadorPasajero.java
// (backend): mismas reglas y MISMOS mensajes. El backend es la autoridad.
// Edad: se exige un mínimo de 16 años (regla de la interfaz, el backend no la aplica) y a los
// menores de 18 se les muestra el aviso de permiso notarial.

// origenDni: de dónde salieron nombres/apellidos ('BD' = pasajero registrado, solo lectura;
// 'APIPERU' = autocompletado; 'MANUAL' o '' = escritos por el usuario). No viaja al backend.
export const DATOS_PASAJERO_VACIOS = {
  nombres: '',
  apellidos: '',
  dni: '',
  fechaNacimiento: '',
  celular: '',
  origenDni: '',
}

export const EDAD_MINIMA_VIAJE = 16
export const EDAD_MAYORIA = 18
export const EDAD_MAXIMA_ANIOS = 120
export const LONGITUD_MAXIMA_NOMBRE = 100
export const MENSAJE_DNI_REPETIDO = 'Este DNI ya está en otro pasajero de esta compra.'
export const AVISO_MENORES = [
  'Los menores de edad deben viajar necesariamente acompañados por sus padres.',
  'En caso de viajar sin sus padres, deberán contar con un permiso notarial, el cual será solicitado al momento del embarque.',
]

const REGEX_NOMBRE = /^\p{L}[\p{L}\p{M} '’.-]*$/u
const REGEX_DNI = /^\d{8}$/
const REGEX_CELULAR = /^9\d{8}$/

// --- Fechas (AAAA-MM-DD) comparadas como enteros: sin problemas de zona horaria ---

function esBisiesto(anio) {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
}

/** Devuelve { anio, mes, dia } o null si el texto no es una fecha real (p. ej. 2026-02-31). */
function leerFechaIso(texto) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto ?? '')
  if (!coincidencia) return null
  const [anio, mes, dia] = coincidencia.slice(1).map(Number)
  if (mes < 1 || mes > 12 || dia < 1) return null
  const diasDelMes = [31, esBisiesto(anio) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return dia <= diasDelMes[mes - 1] ? { anio, mes, dia } : null
}

function aNumero({ anio, mes, dia }) {
  return anio * 10000 + mes * 100 + dia
}

function fechaDeHoy(hoy) {
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1, dia: hoy.getDate() }
}

function restarAnios({ anio, mes, dia }, cantidad) {
  const destino = anio - cantidad
  const diaAjustado = mes === 2 && dia === 29 && !esBisiesto(destino) ? 28 : dia
  return { anio: destino, mes, dia: diaAjustado }
}

/** true si la fecha es válida, no es futura y la persona tiene menos de `edad` años cumplidos. */
function tieneMenosDe(fechaNacimiento, edad, hoy) {
  const nacimiento = leerFechaIso(fechaNacimiento)
  if (!nacimiento) return false
  const actual = fechaDeHoy(hoy)
  if (aNumero(nacimiento) > aNumero(actual)) return false
  return aNumero(nacimiento) > aNumero(restarAnios(actual, edad))
}

/** true si la fecha es válida y la persona tiene menos de 18 años cumplidos. */
export function esMenorDeEdad(fechaNacimiento, hoy = new Date()) {
  return tieneMenosDe(fechaNacimiento, EDAD_MAYORIA, hoy)
}

function validarNombre(valor, mensajeObligatorio, mensajeInvalido) {
  if (!valor) return mensajeObligatorio
  if (valor.length > LONGITUD_MAXIMA_NOMBRE) return 'Máximo 100 caracteres.'
  if (valor.length < 2 || !REGEX_NOMBRE.test(valor)) return mensajeInvalido
  return undefined
}

/**
 * Valida un pasajero. Devuelve { campo: mensaje } (vacío = válido).
 * @param {import('../tipos').DatosPasajero} valores
 */
export function validarPasajero(valores, hoy = new Date()) {
  const datos = valores ?? DATOS_PASAJERO_VACIOS
  const nombres = (datos.nombres ?? '').trim()
  const apellidos = (datos.apellidos ?? '').trim()
  const dni = (datos.dni ?? '').trim()
  const fecha = (datos.fechaNacimiento ?? '').trim()
  const celular = (datos.celular ?? '').trim()
  const errores = {}

  if (!dni) errores.dni = 'Ingresa el DNI.'
  else if (!REGEX_DNI.test(dni)) errores.dni = 'El DNI debe tener 8 dígitos.'

  const errorNombres = validarNombre(nombres, 'Ingresa los nombres.', 'Ingresa un nombre válido.')
  if (errorNombres) errores.nombres = errorNombres
  const errorApellidos = validarNombre(apellidos, 'Ingresa los apellidos.', 'Ingresa un apellido válido.')
  if (errorApellidos) errores.apellidos = errorApellidos

  if (!fecha) {
    errores.fechaNacimiento = 'Selecciona la fecha de nacimiento.'
  } else {
    const nacimiento = leerFechaIso(fecha)
    const actual = fechaDeHoy(hoy)
    if (
      !nacimiento ||
      aNumero(nacimiento) > aNumero(actual) ||
      aNumero(nacimiento) < aNumero(restarAnios(actual, EDAD_MAXIMA_ANIOS))
    ) {
      errores.fechaNacimiento = 'Ingresa una fecha de nacimiento válida.'
    } else if (tieneMenosDe(fecha, EDAD_MINIMA_VIAJE, hoy)) {
      errores.fechaNacimiento = `Debe tener al menos ${EDAD_MINIMA_VIAJE} años.`
    }
  }

  if (!celular) errores.celular = 'Ingresa el celular.'
  else if (!REGEX_CELULAR.test(celular)) errores.celular = 'Ingresa un celular válido (9 dígitos).'

  return errores
}

export function pasajeroEstaCompleto(valores, hoy = new Date()) {
  return Object.keys(validarPasajero(valores, hoy)).length === 0
}

/**
 * DNI repetido en la misma compra. `lista` va en orden: [{ clave, dni }].
 * El error se marca en el 2.º pasajero y siguientes. Devuelve { clave: { dni: mensaje } }.
 */
export function documentosRepetidos(lista) {
  const vistos = new Set()
  const errores = {}
  lista.forEach(({ clave, dni }) => {
    const limpio = (dni ?? '').trim()
    if (!REGEX_DNI.test(limpio)) return
    if (vistos.has(limpio)) errores[clave] = { dni: MENSAJE_DNI_REPETIDO }
    else vistos.add(limpio)
  })
  return errores
}

/** Une mapas { clave: { campo: mensaje } }; ante un mismo campo gana el primero. */
export function combinarErrores(...mapas) {
  const resultado = {}
  mapas.forEach((mapa) => {
    Object.entries(mapa ?? {}).forEach(([clave, campos]) => {
      resultado[clave] = { ...campos, ...(resultado[clave] ?? {}) }
    })
  })
  return resultado
}

// --- Puente con la API ---

/** Cuerpo de POST /api/viajes/{id}/pasajeros. asientos: [{ clave, idAsiento }]. */
export function construirPasajerosApi(asientos, pasajeros) {
  return asientos.map((asiento) => {
    const datos = pasajeros[asiento.clave] ?? DATOS_PASAJERO_VACIOS
    return {
      idAsiento: asiento.idAsiento,
      tipoDocumento: 'DNI',
      numeroDocumento: (datos.dni ?? '').trim(),
      nombres: (datos.nombres ?? '').trim(),
      apellidos: (datos.apellidos ?? '').trim(),
      fechaNacimiento: datos.fechaNacimiento || null,
      nroTelefono: (datos.celular ?? '').trim(),
    }
  })
}

const CAMPO_API_A_FORMULARIO = {
  numeroDocumento: 'dni',
  nombres: 'nombres',
  apellidos: 'apellidos',
  fechaNacimiento: 'fechaNacimiento',
  nroTelefono: 'celular',
  tipoDocumento: 'dni',
  pasajero: 'asiento', // problema del asiento completo, no de un campo
}

/** Errores del servidor [{ idAsiento, campo, mensaje }] -> { clave: { campo: mensaje } }. */
export function mapearErroresServidor(errores, asientos) {
  const claves = new Map(asientos.map((asiento) => [asiento.idAsiento, asiento.clave]))
  const resultado = {}
  ;(errores ?? []).forEach(({ idAsiento, campo, mensaje }) => {
    const clave = claves.get(idAsiento)
    if (!clave) return
    const campoFormulario = CAMPO_API_A_FORMULARIO[campo] ?? 'asiento'
    resultado[clave] = { ...(resultado[clave] ?? {}) }
    if (!resultado[clave][campoFormulario]) resultado[clave][campoFormulario] = mensaje
  })
  return resultado
}