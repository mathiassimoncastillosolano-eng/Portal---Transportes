import { DIAS_HISTORIA, FECHA_REFERENCIA } from '@/config/referencia'
import type { ConsultaDashboard, FiltrosDashboard, PeriodoPreset, RangoFechas } from '@/types/dashboard'
import { sumarDias } from '@/utils/fechas'

export const opcionesPeriodo: { value: PeriodoPreset; label: string }[] = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
  { value: 'custom', label: 'Personalizado' },
]

const DIAS_PRESET: Record<Exclude<PeriodoPreset, 'custom'>, number> = { '7d': 7, '30d': 30, '90d': 90 }

/** Primer día con datos (la historia cubre `DIAS_HISTORIA` días hasta la fecha de referencia). */
export const FECHA_MINIMA = sumarDias(FECHA_REFERENCIA, -(DIAS_HISTORIA - 1))
export const FECHA_MAXIMA = FECHA_REFERENCIA

export const FILTROS_INICIALES: FiltrosDashboard = {
  periodo: '30d',
  rango: { desde: sumarDias(FECHA_REFERENCIA, -29), hasta: FECHA_REFERENCIA },
  agenciaId: 'todas',
  servicioId: 'todos',
  destino: '',
}

/** Rango efectivo: los presets terminan en la fecha de referencia. */
export function resolverRango(filtros: FiltrosDashboard): RangoFechas {
  if (filtros.periodo === 'custom') return filtros.rango
  return { desde: sumarDias(FECHA_REFERENCIA, -(DIAS_PRESET[filtros.periodo] - 1)), hasta: FECHA_REFERENCIA }
}

/** Mensaje de error del rango personalizado, o `null` si es válido. */
export function validarRango(filtros: FiltrosDashboard): string | null {
  if (filtros.periodo !== 'custom') return null
  const { desde, hasta } = filtros.rango
  if (!desde || !hasta) return 'Completa las fechas de inicio y fin.'
  if (desde > hasta) return 'La fecha de inicio no puede ser posterior a la de fin.'
  if (desde < FECHA_MINIMA || hasta > FECHA_MAXIMA) return 'El rango está fuera del período con datos.'
  return null
}

export function aConsulta(filtros: FiltrosDashboard): ConsultaDashboard {
  return {
    rango: resolverRango(filtros),
    agenciaId: filtros.agenciaId === 'todas' ? undefined : filtros.agenciaId,
    servicioId: filtros.servicioId === 'todos' ? undefined : filtros.servicioId,
    destino: filtros.destino || undefined,
  }
}

export function filtrosSonIniciales(f: FiltrosDashboard): boolean {
  return (
    f.periodo === FILTROS_INICIALES.periodo &&
    f.agenciaId === 'todas' &&
    f.servicioId === 'todos' &&
    f.destino === ''
  )
}
