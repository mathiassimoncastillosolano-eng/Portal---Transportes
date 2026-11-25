import type { PasajeroForm } from '../types'

export type ErroresPasajero = Partial<Record<keyof PasajeroForm, string>>

export const EDAD_MINIMA_VIAJE = 16
export const EDAD_MAYORIA = 18
export const EDAD_MAXIMA_ANIOS = 120
export const LONGITUD_MAXIMA_NOMBRE = 100
export const MENSAJE_DNI_DATOS_DISTINTOS = 'Este DNI ya está en otro asiento de esta compra con nombres distintos.'
export const AVISO_MENORES = [
  'Los menores de edad deben viajar necesariamente acompañados por sus padres.',
  'En caso de viajar sin sus padres, deberán contar con un permiso notarial, el cual será solicitado al momento del embarque.',
]

const REGEX_NOMBRE = /^\p{L}[\p{L}\p{M} '.-]*$/u
const REGEX_DNI = /^\d{8}$/
const REGEX_CELULAR = /^9\d{8}$/

interface FechaIso {
  anio: number
  mes: number
  dia: number
}

function esBisiesto(anio: number) {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0
}

function leerFechaIso(texto: string): FechaIso | null {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  if (!coincidencia) return null
  const [anio, mes, dia] = coincidencia.slice(1).map(Number)
  if (mes < 1 || mes > 12 || dia < 1) return null
  const diasDelMes = [31, esBisiesto(anio) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return dia <= diasDelMes[mes - 1] ? { anio, mes, dia } : null
}

const aNumero = ({ anio, mes, dia }: FechaIso) => anio * 10000 + mes * 100 + dia

const fechaDeHoy = (hoy: Date): FechaIso => ({ anio: hoy.getFullYear(), mes: hoy.getMonth() + 1, dia: hoy.getDate() })

function restarAnios({ anio, mes, dia }: FechaIso, cantidad: number): FechaIso {
  const destino = anio - cantidad
  return { anio: destino, mes, dia: mes === 2 && dia === 29 && !esBisiesto(destino) ? 28 : dia }
}

const aTexto = ({ anio, mes, dia }: FechaIso) => `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

function tieneMenosDe(fechaNacimiento: string, edad: number, hoy: Date) {
  const nacimiento = leerFechaIso(fechaNacimiento)
  if (!nacimiento) return false
  const actual = fechaDeHoy(hoy)
  if (aNumero(nacimiento) > aNumero(actual)) return false
  return aNumero(nacimiento) > aNumero(restarAnios(actual, edad))
}

export function esMenorDeEdad(fechaNacimiento: string, hoy = new Date()) {
  return tieneMenosDe(fechaNacimiento, EDAD_MAYORIA, hoy)
}

export function fechaMinimaNacimiento(hoy = new Date()) {
  return aTexto(restarAnios(fechaDeHoy(hoy), EDAD_MAXIMA_ANIOS))
}

function validarNombre(valor: string, mensajeObligatorio: string, mensajeInvalido: string) {
  if (!valor) return mensajeObligatorio
  if (valor.length > LONGITUD_MAXIMA_NOMBRE) return 'Máximo 100 caracteres.'
  if (valor.length < 2 || !REGEX_NOMBRE.test(valor)) return mensajeInvalido
  return undefined
}

export function validarPasajero(f: PasajeroForm, hoy = new Date()): ErroresPasajero {
  const errores: ErroresPasajero = {}
  const dni = f.dni.trim()
  const nombres = f.nombres.trim()
  const apellidos = f.apellidos.trim()
  const fecha = f.fechaNacimiento.trim()
  const celular = f.celular.trim()

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

export function pasajeroEstaCompleto(f: PasajeroForm | undefined, hoy = new Date()) {
  return !!f && Object.keys(validarPasajero(f, hoy)).length === 0
}

function claveIdentidad(nombres: string, apellidos: string) {
  const limpiar = (t: string) => t.trim().replace(/\s+/g, ' ').toLowerCase()
  return `${limpiar(nombres)}|${limpiar(apellidos)}`
}

export function dniConDatosDistintos(lista: { idAsiento: number; form: PasajeroForm | undefined }[]) {
  const vistos = new Map<string, string>()
  const errores: Record<number, ErroresPasajero> = {}
  lista.forEach(({ idAsiento, form }) => {
    if (!form) return
    const dni = form.dni.trim()
    if (!REGEX_DNI.test(dni)) return
    const identidad = claveIdentidad(form.nombres, form.apellidos)
    if (!vistos.has(dni)) vistos.set(dni, identidad)
    else if (vistos.get(dni) !== identidad) errores[idAsiento] = { dni: MENSAJE_DNI_DATOS_DISTINTOS }
  })
  return errores
}

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
