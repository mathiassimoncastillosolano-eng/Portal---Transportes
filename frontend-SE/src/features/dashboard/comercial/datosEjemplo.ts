import type { VentasDia } from './modelo'

/** Datos inventados y deterministas, únicamente para revisar la vista local. */
export const FECHA_CORTE = '2026-11-21'

function fechaIso(diasAntes: number): string {
  const fecha = new Date(`${FECHA_CORTE}T12:00:00Z`)
  fecha.setUTCDate(fecha.getUTCDate() - diasAntes)
  return fecha.toISOString().slice(0, 10)
}

export const DATOS_EJEMPLO: VentasDia[] = Array.from({ length: 180 }, (_, indice) => {
  const antiguedad = 179 - indice
  const fecha = fechaIso(antiguedad)
  const diaSemana = new Date(`${fecha}T12:00:00Z`).getUTCDay()
  const finDeSemana = diaSemana === 5 || diaSemana === 6
  const crecimiento = indice >= 90 ? 2 : 0
  const webPasajes = 7 + (indice * 2) % 7 + crecimiento + (finDeSemana ? 3 : 0)
  const agenciaPasajes = 6 + (indice * 3) % 5 + (finDeSemana ? 2 : 0)

  return {
    fecha,
    webPasajes,
    webCompras: Math.max(1, Math.round(webPasajes / 1.25)),
    webIngresos: webPasajes * (78 + indice % 7),
    agenciaPasajes,
    agenciaCompras: Math.max(1, Math.round(agenciaPasajes / 1.2)),
    agenciaIngresos: agenciaPasajes * (82 + indice % 6),
  }
})
