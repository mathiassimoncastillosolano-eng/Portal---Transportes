import { DIAS_HISTORIA } from '@/config/referencia'
import type { ConsultaDashboard, FiltrosDashboard, PeriodoPreset, RangoFechas } from '@/types/dashboard'
import { sumarDias } from '@/utils/fechas'

/**
 * Períodos del Dashboard. Todas las funciones reciben `hoy` (YYYY-MM-DD), la fecha que entrega el servicio:
 * con datos reales es la fecha de hoy en Perú; con datos simulados, la fecha de referencia del MVP.
 */

export const opcionesPeriodo: { value: PeriodoPreset; label: string }[] = [
  { value: '7d', label: '7 días' },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
  { value: 'custom', label: 'Personalizado' },
]

const DIAS_PRESET: Record<Exclude<PeriodoPreset, 'custom'>, number> = { '7d': 7, '30d': 30, '90d': 90 }

/** Primer día que se puede consultar (la historia cubre `DIAS_HISTORIA` días hasta hoy). */
export function fechaMinima(hoy: string): string {
  return sumarDias(hoy, -(DIAS_HISTORIA - 1))
}

/** Filtros con los que abre el Dashboard: últimos 30 días, sin filtros. */
export function filtrosIniciales(hoy: string): FiltrosDashboard {
  return {
    periodo: '30d',
    rango: { desde: sumarDias(hoy, -29), hasta: hoy },
    agenciaId: 'todas',
    servicioId: 'todos',
    destino: '',
  }
}

/** Rango efectivo: los presets terminan hoy; "Personalizado" usa el rango elegido. */
export function resolverRango(filtros: FiltrosDashboard, hoy: string): RangoFechas {
  if (filtros.periodo === 'custom') return filtros.rango
  return { desde: sumarDias(hoy, -(DIAS_PRESET[filtros.periodo] - 1)), hasta: hoy }
}

/** Mensaje de error del rango personalizado, o `null` si es válido. */
export function validarRango(filtros: FiltrosDashboard, hoy: string): string | null {
  if (filtros.periodo !== 'custom') return null
  const { desde, hasta } = filtros.rango
  if (!desde || !hasta) return 'Completa las fechas de inicio y fin.'
  if (desde > hasta) return 'La fecha de inicio no puede ser posterior a la de fin.'
  if (desde < fechaMinima(hoy) || hasta > hoy) return 'El rango está fuera del período con datos.'
  return null
}

/** Convierte los filtros de la pantalla en la consulta que recibe el servicio. */
export function aConsulta(filtros: FiltrosDashboard, hoy: string): ConsultaDashboard {
  return {
    rango: resolverRango(filtros, hoy),
    agenciaId: filtros.agenciaId === 'todas' ? undefined : filtros.agenciaId,
    servicioId: filtros.servicioId === 'todos' ? undefined : filtros.servicioId,
    destino: filtros.destino || undefined,
  }
}

export function filtrosSonIniciales(f: FiltrosDashboard): boolean {
  return f.periodo === '30d' && f.agenciaId === 'todas' && f.servicioId === 'todos' && f.destino === ''
}
