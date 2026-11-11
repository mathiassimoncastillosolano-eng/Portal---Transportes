import type { Agencia } from '@/types/agency'
import type { PeriodoDatos, RangoFechas, VentaFact, ViajeOcupacionFact } from '@/types/dashboard'
import type { Servicio, ServicioId } from '@/types/servicio'
import { listarDias } from '@/utils/fechas'

/**
 * Agregaciones PURAS del Dashboard (sin efectos ni acceso a servicios):
 * reciben hechos de venta y devuelven números/series. Toda cifra que ve el
 * usuario sale de sumar pasajes; no existen datos propios del Dashboard.
 * Regla: solo cuentan los pasajes en estado `emitido`.
 */

export function soloEmitidos(ventas: VentaFact[]): VentaFact[] {
  return ventas.filter((v) => v.estado === 'emitido')
}

export function calcularIngresos(ventas: VentaFact[]): number {
  return soloEmitidos(ventas).reduce((suma, v) => suma + v.ingreso, 0)
}

export function contarPasajes(ventas: VentaFact[]): number {
  return soloEmitidos(ventas).length
}

/** Ingresos / pasajes vendidos; `null` si no hay ventas. */
export function ticketPromedio(ventas: VentaFact[]): number | null {
  const n = contarPasajes(ventas)
  return n === 0 ? null : calcularIngresos(ventas) / n
}

/** Promedio (0–100) de asientos vendidos / capacidad de los viajes finalizados con ventas; `null` si no hay viajes. */
export function ocupacionPromedio(viajes: ViajeOcupacionFact[]): number | null {
  if (viajes.length === 0) return null
  const suma = viajes.reduce((s, v) => s + (v.vendidos / v.capacidad) * 100, 0)
  return suma / viajes.length
}

export function viajesConVentas(ventas: VentaFact[]): number {
  return new Set(soloEmitidos(ventas).map((v) => v.viajeId)).size
}

export function agenciasActivas(ventas: VentaFact[]): number {
  return new Set(soloEmitidos(ventas).map((v) => v.agenciaId)).size
}

/** Variación porcentual respecto al período anterior; `null` si no hay base de comparación. */
export function variacionRelativa(actual: number | null, anterior: number | null): number | null {
  if (actual === null || anterior === null || anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}

/** Diferencia en puntos porcentuales (para ocupación). */
export function variacionPuntos(actual: number | null, anterior: number | null): number | null {
  if (actual === null || anterior === null) return null
  return actual - anterior
}

export type KpiId = 'ingresos' | 'pasajes' | 'ocupacion' | 'ticket' | 'viajes' | 'agencias'

export interface Kpi {
  id: KpiId
  valor: number | null
  /** Variación frente al período anterior comparable. */
  variacion: number | null
  /** 'pp' = puntos porcentuales; 'porcentaje' = variación relativa. */
  tipoVariacion: 'porcentaje' | 'pp'
}

export function calcularKpis(actual: PeriodoDatos, anterior: PeriodoDatos): Kpi[] {
  const va = actual.ventas
  const vb = anterior.ventas
  const ocupA = ocupacionPromedio(actual.viajes)
  const ocupB = ocupacionPromedio(anterior.viajes)
  return [
    { id: 'ingresos', valor: calcularIngresos(va), variacion: variacionRelativa(calcularIngresos(va), calcularIngresos(vb)), tipoVariacion: 'porcentaje' },
    { id: 'pasajes', valor: contarPasajes(va), variacion: variacionRelativa(contarPasajes(va), contarPasajes(vb)), tipoVariacion: 'porcentaje' },
    { id: 'ocupacion', valor: ocupA, variacion: variacionPuntos(ocupA, ocupB), tipoVariacion: 'pp' },
    { id: 'ticket', valor: ticketPromedio(va), variacion: variacionRelativa(ticketPromedio(va), ticketPromedio(vb)), tipoVariacion: 'porcentaje' },
    { id: 'viajes', valor: viajesConVentas(va), variacion: variacionRelativa(viajesConVentas(va), viajesConVentas(vb)), tipoVariacion: 'porcentaje' },
    { id: 'agencias', valor: agenciasActivas(va), variacion: variacionRelativa(agenciasActivas(va), agenciasActivas(vb)), tipoVariacion: 'porcentaje' },
  ]
}

export interface PuntoSerie {
  fecha: string
  ingresos: number
  pasajes: number
}

/** Ingresos y pasajes por día de emisión, con ceros en los días sin ventas. */
export function serieDiaria(ventas: VentaFact[], rango: RangoFechas): PuntoSerie[] {
  const porDia = new Map<string, PuntoSerie>()
  for (const fecha of listarDias(rango.desde, rango.hasta)) porDia.set(fecha, { fecha, ingresos: 0, pasajes: 0 })
  for (const v of soloEmitidos(ventas)) {
    const punto = porDia.get(v.fecha)
    if (punto) {
      punto.ingresos += v.ingreso
      punto.pasajes += 1
    }
  }
  return [...porDia.values()]
}

export interface FilaRanking {
  clave: string
  etiqueta: string
  ingresos: number
  pasajes: number
  ticket: number
  /** % de los ingresos totales del conjunto filtrado. */
  participacion: number
}

function agrupar(
  ventas: VentaFact[],
  claveDe: (v: VentaFact) => string,
  etiquetaDe: (clave: string) => string,
): FilaRanking[] {
  const emitidos = soloEmitidos(ventas)
  const total = emitidos.reduce((s, v) => s + v.ingreso, 0)
  const mapa = new Map<string, { ingresos: number; pasajes: number }>()
  for (const v of emitidos) {
    const clave = claveDe(v)
    const acum = mapa.get(clave) ?? { ingresos: 0, pasajes: 0 }
    acum.ingresos += v.ingreso
    acum.pasajes += 1
    mapa.set(clave, acum)
  }
  return [...mapa.entries()]
    .map(([clave, { ingresos, pasajes }]) => ({
      clave,
      etiqueta: etiquetaDe(clave),
      ingresos,
      pasajes,
      ticket: ingresos / pasajes,
      participacion: total === 0 ? 0 : (ingresos / total) * 100,
    }))
    .sort((a, b) => b.ingresos - a.ingresos)
}

export function agruparPorAgencia(ventas: VentaFact[], agencias: Agencia[]): FilaRanking[] {
  return agrupar(ventas, (v) => v.agenciaId, (id) => agencias.find((a) => a.id === id)?.name ?? id)
}

export function agruparPorServicio(ventas: VentaFact[], servicios: Servicio[]): (FilaRanking & { servicioId: ServicioId })[] {
  return agrupar(ventas, (v) => v.servicioId, (id) => servicios.find((s) => s.id === id)?.nombre ?? id).map((f) => ({
    ...f,
    servicioId: f.clave as ServicioId,
  }))
}

export function agruparPorRuta(ventas: VentaFact[]): FilaRanking[] {
  return agrupar(ventas, (v) => `${v.origen} → ${v.destino}`, (clave) => clave)
}

export function totalRanking(filas: FilaRanking[]) {
  const ingresos = filas.reduce((s, f) => s + f.ingresos, 0)
  const pasajes = filas.reduce((s, f) => s + f.pasajes, 0)
  return { ingresos, pasajes, ticket: pasajes === 0 ? 0 : ingresos / pasajes }
}
