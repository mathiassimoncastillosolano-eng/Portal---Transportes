// Utilidades puras del selector de fecha de nacimiento. Todo trabaja con cadenas
// "YYYY-MM-DD" y con año/mes/día numéricos: nunca se usa Date.parse ni toISOString
// sobre una fecha local, así no hay saltos de día por zona horaria (UTC).

export const ANIOS_MAXIMOS = 120
export const ANIOS_POR_PAGINA = 12

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

export function pad(n, largo = 2) {
  return String(n).padStart(largo, '0')
}

export function aIso(anio, mes, dia) {
  return `${pad(anio, 4)}-${pad(mes + 1)}-${pad(dia)}`
}

/** "YYYY-MM-DD" -> { anio, mes (0-11), dia } o null si no existe esa fecha. */
export function leerIso(iso) {
  const m = ISO.exec(iso ?? '')
  if (!m) return null
  const anio = Number(m[1]); const mes = Number(m[2]) - 1; const dia = Number(m[3])
  if (mes < 0 || mes > 11 || dia < 1 || dia > diasDelMes(anio, mes)) return null
  return { anio, mes, dia }
}

export function diasDelMes(anio, mes) {
  return new Date(anio, mes + 1, 0).getDate()
}

/** Rango permitido: de (hoy − 120 años) a hoy, ambos incluidos. */
export function limitesNacimiento(hoy = new Date()) {
  const max = { anio: hoy.getFullYear(), mes: hoy.getMonth(), dia: hoy.getDate() }
  const anioMin = max.anio - ANIOS_MAXIMOS
  // 29 de febrero hace 120 años puede no existir: se usa el 28.
  const diaMin = Math.min(max.dia, diasDelMes(anioMin, max.mes))
  return { min: { anio: anioMin, mes: max.mes, dia: diaMin }, max }
}

const clave = (f) => f.anio * 10000 + f.mes * 100 + f.dia

export function estaEnRango(fecha, limites) {
  const k = clave(fecha)
  return k >= clave(limites.min) && k <= clave(limites.max)
}

/** El mes (anio, mes) tiene al menos un día dentro del rango. */
export function mesEnRango(anio, mes, limites) {
  const ini = anio * 100 + mes
  return ini >= limites.min.anio * 100 + limites.min.mes && ini <= limites.max.anio * 100 + limites.max.mes
}

export function anioEnRango(anio, limites) {
  return anio >= limites.min.anio && anio <= limites.max.anio
}

/** Ajusta una fecha (que puede tener día inexistente tras cambiar de mes/año) al rango válido. */
export function ajustarAlRango(anio, mes, dia, limites) {
  const dd = Math.min(dia, diasDelMes(anio, mes))
  let f = { anio, mes, dia: dd }
  if (clave(f) < clave(limites.min)) f = { ...limites.min }
  if (clave(f) > clave(limites.max)) f = { ...limites.max }
  return f
}

/** Primer año de la página de años (de 12 en 12) que contiene `anio`. */
export function inicioPaginaAnios(anio) {
  return anio - (((anio % ANIOS_POR_PAGINA) + ANIOS_POR_PAGINA) % ANIOS_POR_PAGINA)
}

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function textoFecha(iso) {
  const f = leerIso(iso)
  return f ? `${f.dia} de ${MESES[f.mes]} de ${f.anio}` : ''
}
