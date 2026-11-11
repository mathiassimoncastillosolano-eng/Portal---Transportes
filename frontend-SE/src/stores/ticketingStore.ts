import { create } from 'zustand'
import { crearSemillaTicketing } from '@/data/mock'
import type { Pasaje } from '@/types/pasaje'
import type { DatosPago } from '@/types/pago'
import type { DatosPasajero, Pasajero } from '@/types/pasajero'
import type { Viaje } from '@/types/viaje'
import { FECHA_REFERENCIA } from '@/config/referencia'

/**
 * Estado de negocio en memoria del MVP (sin `persist`: recargar la página
 * vuelve al estado semilla). Es la ÚNICA fuente de datos que leen los mock
 * services, así que una operación registrada en el flujo se refleja de
 * inmediato en la disponibilidad de asientos y en el Dashboard.
 *
 * Las escrituras son atómicas: `emitirOperacion` valida TODOS los asientos
 * de la operación antes de escribir nada; si alguno ya no es válido, no se
 * registra ninguno (todo o nada), y se agregan los pasajes, se marcan los
 * asientos como ocupados y se descuenta la disponibilidad del viaje en un
 * solo `set`.
 */

export interface ItemEmision {
  asiento: number
  pasajero: DatosPasajero
}

export interface EmisionOperacion {
  viajeId: string
  items: ItemEmision[]
  pago: DatosPago
  vuelto?: number
  agenciaVentaId: string
}

export type ResultadoEmision =
  | { ok: true; operacionId: string; pasajes: Pasaje[]; pasajeros: Pasajero[]; viaje: Viaje }
  | { ok: false; motivo: 'NO_ENCONTRADO' | 'NO_VENDIBLE' | 'ASIENTO_OCUPADO'; asientoConflicto?: number }

interface TicketingState {
  viajes: Viaje[]
  pasajes: Pasaje[]
  pasajeros: Pasajero[]
  asientosOcupados: Record<string, number[]>
  /** Último correlativo usado en RL-PS-xxxxxx. */
  ultimoCorrelativoPasaje: number
  /** Último correlativo usado en RL-OP-xxxxxx. */
  ultimoCorrelativoOperacion: number
  emitirOperacion: (datos: EmisionOperacion) => ResultadoEmision
}

const semilla = crearSemillaTicketing()

function ahoraLocal(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  // La fecha es la de referencia del sistema; la hora es la del reloj real.
  return `${FECHA_REFERENCIA}T${hh}:${mm}:${ss}`
}

export const useTicketingStore = create<TicketingState>()((set, get) => ({
  viajes: semilla.viajes,
  pasajes: semilla.pasajes,
  pasajeros: [], // se completan bajo demanda; los pasajes semilla usan el pool de `pasajerosMock`
  asientosOcupados: semilla.asientosOcupados,
  ultimoCorrelativoPasaje: semilla.pasajes.length,
  ultimoCorrelativoOperacion: semilla.pasajes.length,

  emitirOperacion: (datos) => {
    const estado = get()
    const viaje = estado.viajes.find((v) => v.id === datos.viajeId)
    if (!viaje) return { ok: false, motivo: 'NO_ENCONTRADO' }
    if (viaje.estado !== 'programado' || viaje.fecha < FECHA_REFERENCIA) {
      return { ok: false, motivo: 'NO_VENDIBLE' }
    }
    if (datos.items.length > viaje.asientosDisponibles) {
      return { ok: false, motivo: 'NO_VENDIBLE' }
    }

    // Validación atómica: si cualquier asiento ya está ocupado, no se
    // registra ningún pasaje de la operación (todo o nada).
    const ocupadosPrevios = estado.asientosOcupados[viaje.id] ?? []
    for (const item of datos.items) {
      if (ocupadosPrevios.includes(item.asiento)) {
        return { ok: false, motivo: 'ASIENTO_OCUPADO', asientoConflicto: item.asiento }
      }
    }

    let pasajeros = estado.pasajeros
    let correlativoPasaje = estado.ultimoCorrelativoPasaje
    const correlativoOperacion = estado.ultimoCorrelativoOperacion + 1
    const operacionId = `RL-OP-${String(correlativoOperacion).padStart(6, '0')}`
    const nuevosPasajes: Pasaje[] = []

    for (const item of datos.items) {
      const existente = pasajeros.find(
        (p) => p.tipoDocumento === item.pasajero.tipoDocumento && p.numeroDocumento === item.pasajero.numeroDocumento,
      )
      const pasajero: Pasajero = existente
        ? { ...existente, ...item.pasajero }
        : { id: `pj-nuevo-${pasajeros.length + nuevosPasajes.length + 1}`, ...item.pasajero }
      pasajeros = existente ? pasajeros.map((p) => (p.id === existente.id ? pasajero : p)) : [...pasajeros, pasajero]

      correlativoPasaje += 1
      nuevosPasajes.push({
        id: `ps-${correlativoPasaje}`,
        codigo: `RL-PS-${String(correlativoPasaje).padStart(6, '0')}`,
        operacionId,
        viajeId: viaje.id,
        pasajeroId: pasajero.id,
        asiento: item.asiento,
        servicioId: viaje.servicioId,
        precio: viaje.tarifa,
        metodoPagoId: datos.pago.metodoPagoId,
        referenciaPago: datos.pago.referencia,
        montoRecibido: datos.pago.montoRecibido,
        vuelto: datos.vuelto,
        fechaEmision: ahoraLocal(),
        estado: 'emitido',
        agenciaVentaId: datos.agenciaVentaId,
      })
    }

    const viajeActualizado: Viaje = {
      ...viaje,
      asientosOcupados: viaje.asientosOcupados + nuevosPasajes.length,
      asientosDisponibles: viaje.asientosDisponibles - nuevosPasajes.length,
    }

    set({
      pasajes: [...estado.pasajes, ...nuevosPasajes],
      pasajeros,
      viajes: estado.viajes.map((v) => (v.id === viaje.id ? viajeActualizado : v)),
      asientosOcupados: {
        ...estado.asientosOcupados,
        [viaje.id]: [...ocupadosPrevios, ...datos.items.map((i) => i.asiento)],
      },
      ultimoCorrelativoPasaje: correlativoPasaje,
      ultimoCorrelativoOperacion: correlativoOperacion,
    })

    return { ok: true, operacionId, pasajes: nuevosPasajes, pasajeros, viaje: viajeActualizado }
  },
}))
