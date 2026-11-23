import type { AsientoElegido } from '@/features/ticketing/types'
import type { ConfirmacionCambio, MetodoPagoAgencia } from '@/types/cambioViaje'
import type { ViajeHistorial } from '@/types/cliente'
import type { ViajeConsulta } from '@/types/consultaViaje'

// Reglas del cambio de viajes que usa la pantalla. Las mismas reglas las vuelve a revisar el backend.

export const HORAS_MINIMAS = 6
const MS_HORA = 3_600_000

// Minutos que el asiento nuevo queda reservado mientras el agente verifica, cobra y confirma.
export const MINUTOS_RESERVA_CAMBIO = 10

export const ETIQUETA_METODO: Record<MetodoPagoAgencia, string> = {
  EFECTIVO: 'Efectivo',
  YAPE: 'Yape',
  TARJETA: 'Tarjeta',
}

// ---------- plazo de 6 horas ----------

export function salidaMs(fecha: string | null, hora: string | null): number {
  if (!fecha || !hora) return Number.NaN
  return Date.parse(`${fecha}T${hora.slice(0, 5)}:00-05:00`)
}

export function plazoCambioMs(pasaje: Pick<ViajeHistorial, 'fechaSalida' | 'horaSalida'>): number {
  return salidaMs(pasaje.fechaSalida, pasaje.horaSalida) - HORAS_MINIMAS * MS_HORA
}

/** true si el viaje todavía no sale pero faltan menos de 6 h: el pasaje ya no se puede cambiar. */
export function estaFueraDePlazoDeCambio(
  pasaje: Pick<ViajeHistorial, 'fechaSalida' | 'horaSalida'>,
  ahoraMs: number,
): boolean {
  const salida = salidaMs(pasaje.fechaSalida, pasaje.horaSalida)
  if (!Number.isFinite(salida)) return false
  return salida > ahoraMs && salida - ahoraMs < HORAS_MINIMAS * MS_HORA
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

// ---------- mensajes para el agente según el código que manda el backend ----------

const MENSAJES_RECHAZO: Record<string, string> = {
  PASAJE_NO_VIGENTE: 'Este pasaje no se puede cambiar: ya fue usado, se reembolsó o su pago no está confirmado.',
  VIAJE_INICIADO: 'El viaje original ya salió, por eso el pasaje ya no se puede cambiar.',
  ANTICIPACION_INSUFICIENTE: `Faltan menos de ${HORAS_MINIMAS} horas para la salida. Ya no se puede cambiar este pasaje.`,
}

export function mensajeDeRechazo(codigo: string | null, motivoDelServidor: string | null): string {
  if (codigo && MENSAJES_RECHAZO[codigo]) return MENSAJES_RECHAZO[codigo]
  return motivoDelServidor ?? 'Este pasaje no se puede cambiar.'
}

// Si el backend responde con uno de estos códigos, el asiento ya no está reservado y hay que elegir otro.
export const CODIGOS_ASIENTO_PERDIDO = ['SESION_VENCIDA', 'ASIENTO_NO_DISPONIBLE']

// Si responde con uno de estos, el pasaje ya no se puede cambiar.
export const CODIGOS_PASAJE_NO_CAMBIABLE = Object.keys(MENSAJES_RECHAZO)

// ---------- política de identidad (solo se verifica, no se guarda) ----------

export type Solicitante = 'TITULAR' | 'TERCERO'

export interface DocumentoRequerido {
  id: string
  texto: string
}

export function documentosRequeridos(
  solicitante: Solicitante,
  pasaje: Pick<ViajeHistorial, 'documento' | 'numeroBoleto'>,
): DocumentoRequerido[] {
  const boleto = { id: 'boleto', texto: `Boleto ${pasaje.numeroBoleto}, impreso o en el celular` }
  if (solicitante === 'TITULAR') {
    return [{ id: 'dni-titular', texto: `DNI original del pasajero (${pasaje.documento}), coincide con el boleto` }, boleto]
  }
  return [
    { id: 'dni-tercero', texto: 'DNI original de la persona que realiza el trámite' },
    { id: 'copia-dni-titular', texto: `Copia del DNI del pasajero (${pasaje.documento})` },
    boleto,
    { id: 'carta-poder', texto: 'Carta poder simple firmada por el pasajero' },
  ]
}

// ---------- efectivo: vuelto (solo en pantalla, no se guarda) ----------

export const BILLETES_RAPIDOS = [10, 20, 50, 100, 200]

// Se calcula en céntimos para que 20 - 12.30 dé exactamente 7.70.
export function calcularVuelto(montoAPagar: number, montoRecibido: number): number | null {
  if (!Number.isFinite(montoRecibido)) return null
  const vuelto = Math.round(montoRecibido * 100) - Math.round(montoAPagar * 100)
  return vuelto < 0 ? null : vuelto / 100
}

// Efectivo: debe haber un monto recibido que cubra la diferencia.
// Yape o tarjeta: siempre el código del POS (de operación si se aprobó, de error si se rechazó).
export function pagoListoParaRegistrar(
  pago: { metodo: MetodoPagoAgencia; recibido: string; codigo: string },
  montoAPagar: number,
): boolean {
  if (pago.metodo === 'EFECTIVO') return pago.recibido !== '' && calcularVuelto(montoAPagar, Number(pago.recibido)) !== null
  return pago.codigo.trim() !== ''
}

export function nuevaClaveDeIntento(): string {
  return crypto.randomUUID()
}

// El mismo pasaje con los datos del viaje nuevo, para mostrar el boleto actualizado.
// El precio no cambia: el pasaje conserva su compra y su pago original.
export function pasajeDespuesDelCambio(
  pasaje: ViajeHistorial,
  confirmacion: ConfirmacionCambio,
  viaje: ViajeConsulta,
  asiento: AsientoElegido,
): ViajeHistorial {
  return {
    ...pasaje,
    origen: confirmacion.origen,
    destino: confirmacion.destino,
    fechaSalida: confirmacion.fechaSalida,
    horaSalida: confirmacion.horaSalida,
    fechaLlegada: viaje.fechaLlegada,
    horaLlegada: viaje.horaLlegada,
    asiento: confirmacion.asientoNuevo,
    piso: asiento.piso,
    bus: viaje.tipoBus,
  }
}
