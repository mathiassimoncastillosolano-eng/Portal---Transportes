import type { ViajeHistorial } from '@/types/cliente'

export const HORAS_MINIMAS = 6
const MS_HORA = 3_600_000

export type EscenarioTarifa = 'IGUAL' | 'SUPERIOR' | 'INFERIOR'
export type MetodoCambio = 'EFECTIVO' | 'YAPE' | 'TARJETA'
export type ResultadoTerminal = 'APROBADO' | 'RECHAZADO'

export interface ComparacionTarifa {
  escenario: EscenarioTarifa
  original: number
  nueva: number
  diferencia: number
  montoAPagar: number
  montoNoDevuelto: number
}

export type Elegibilidad =
  | { elegible: true }
  | { elegible: false; codigo: 'PASAJE_NO_VIGENTE' | 'VIAJE_INICIADO' | 'ANTICIPACION_INSUFICIENTE'; mensaje: string }

export const ETIQUETA_METODO: Record<MetodoCambio, string> = {
  EFECTIVO: 'Efectivo',
  YAPE: 'Yape',
  TARJETA: 'Tarjeta',
}

export function salidaMs(fecha: string | null, hora: string | null): number {
  if (!fecha || !hora) return Number.NaN
  return Date.parse(`${fecha}T${hora.slice(0, 5)}:00-05:00`)
}

export function plazoPostergacionMs(pasaje: Pick<ViajeHistorial, 'fechaSalida' | 'horaSalida'>): number {
  return salidaMs(pasaje.fechaSalida, pasaje.horaSalida) - HORAS_MINIMAS * MS_HORA
}

export function formatearMomento(ms: number): string {
  if (!Number.isFinite(ms)) return '—'
  return new Date(ms).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Lima',
  })
}

export function validarElegibilidad(pasaje: ViajeHistorial, ahoraMs: number): Elegibilidad {
  if (pasaje.estadoPasaje !== 'CONFIRMADA' || pasaje.fase !== 'PROXIMO') {
    return {
      elegible: false,
      codigo: 'PASAJE_NO_VIGENTE',
      mensaje: 'Solo se pueden postergar pasajes vigentes. Este pasaje ya fue utilizado, reembolsado o no está confirmado.',
    }
  }
  const salida = salidaMs(pasaje.fechaSalida, pasaje.horaSalida)
  if (!Number.isFinite(salida) || salida <= ahoraMs) {
    return { elegible: false, codigo: 'VIAJE_INICIADO', mensaje: 'El viaje original ya salió, por lo que no se puede postergar.' }
  }
  if (salida - ahoraMs < HORAS_MINIMAS * MS_HORA) {
    return {
      elegible: false,
      codigo: 'ANTICIPACION_INSUFICIENTE',
      mensaje: `La postergación requiere al menos ${HORAS_MINIMAS} horas de anticipación respecto a la salida original.`,
    }
  }
  return { elegible: true }
}

function normalizar(texto: string): string {
  return texto.trim().toLowerCase()
}

export function esMismaRuta(pasaje: Pick<ViajeHistorial, 'origen' | 'destino'>, origen: string, destino: string): boolean {
  const o = normalizar(origen)
  const d = normalizar(destino)
  const po = normalizar(pasaje.origen)
  const pd = normalizar(pasaje.destino)
  return (o === po && d === pd) || (o === pd && d === po)
}

export function esMismoViaje(
  pasaje: Pick<ViajeHistorial, 'origen' | 'destino' | 'fechaSalida' | 'horaSalida'>,
  viaje: { origen: string; destino: string; fechaSalida: string; horaSalida: string },
): boolean {
  return (
    normalizar(pasaje.origen) === normalizar(viaje.origen) &&
    normalizar(pasaje.destino) === normalizar(viaje.destino) &&
    pasaje.fechaSalida === viaje.fechaSalida &&
    (pasaje.horaSalida ?? '').slice(0, 5) === viaje.horaSalida.slice(0, 5)
  )
}

export function compararTarifas(original: number, nueva: number): ComparacionTarifa {
  const delta = Math.round(nueva * 100) - Math.round(original * 100)
  return {
    escenario: delta === 0 ? 'IGUAL' : delta > 0 ? 'SUPERIOR' : 'INFERIOR',
    original,
    nueva,
    diferencia: Math.abs(delta) / 100,
    montoAPagar: delta > 0 ? delta / 100 : 0,
    montoNoDevuelto: delta < 0 ? -delta / 100 : 0,
  }
}