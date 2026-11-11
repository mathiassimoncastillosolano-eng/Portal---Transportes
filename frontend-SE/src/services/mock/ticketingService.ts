import { agenciasMock, pasajerosMock, serviciosMock } from '@/data/mock'
import { FECHA_REFERENCIA } from '@/config/referencia'
import { useTicketingStore } from '@/stores/ticketingStore'
import { codigoDeAsiento } from '@/utils/asientos'
import { MAX_ASIENTOS_OPERACION, type ComprobantePasaje } from '@/types/pasaje'
import type { Viaje, ViajeListado } from '@/types/viaje'
import type { TicketingService } from '../contracts'
import { ServiceError } from '../errors'
import { simularLatencia } from './latencia'

/**
 * Para poder demostrar el conflicto de asiento sin dos ventanillas reales, el
 * PRIMER intento de confirmar una operación que incluya el asiento 13 de un
 * viaje simula que otra ventanilla lo vendió un instante antes: se registra
 * ese asiento a nombre de otro pasajero antes de intentar la operación real,
 * que entonces falla de forma atómica (no se emite ningún pasaje) señalando
 * ese asiento como el conflicto. El reintento sin ese asiento sigue el flujo
 * normal.
 */
const ASIENTO_CONFLICTO_SIMULADO = 13
const conflictosSimulados = new Set<string>()

function listar(viaje: Viaje): ViajeListado {
  let motivo: ViajeListado['motivoNoVendible']
  if (viaje.fecha < FECHA_REFERENCIA) motivo = 'salido'
  else if (viaje.estado === 'cancelado') motivo = 'cancelado'
  else if (viaje.asientosDisponibles <= 0) motivo = 'agotado'
  return { ...viaje, vendible: motivo === undefined, motivoNoVendible: motivo }
}

export const ticketingServiceMock: TicketingService = {
  async buscarViajes(filtros) {
    await simularLatencia()
    const { viajes } = useTicketingStore.getState()
    // Los viajes anteriores a la fecha de referencia ya salieron: no se ofrecen.
    if (filtros.fecha < FECHA_REFERENCIA) return []
    return viajes
      .filter(
        (v) =>
          v.fecha === filtros.fecha &&
          (!filtros.origen || v.origen === filtros.origen) &&
          (!filtros.destino || v.destino === filtros.destino) &&
          (!filtros.servicioId || v.servicioId === filtros.servicioId),
      )
      .sort((a, b) => a.hora.localeCompare(b.hora) || a.origen.localeCompare(b.origen, 'es'))
      .map(listar)
  },

  async obtenerViaje(id) {
    await simularLatencia(120, 250)
    const viaje = useTicketingStore.getState().viajes.find((v) => v.id === id)
    if (!viaje) throw new ServiceError('NO_ENCONTRADO', 'El viaje no existe.')
    return viaje
  },

  async obtenerAsientos(viajeId) {
    await simularLatencia(150, 350)
    const { viajes, asientosOcupados } = useTicketingStore.getState()
    const viaje = viajes.find((v) => v.id === viajeId)
    if (!viaje) throw new ServiceError('NO_ENCONTRADO', 'El viaje no existe.')
    const servicio = serviciosMock.find((s) => s.id === viaje.servicioId)
    if (!servicio) throw new ServiceError('NO_ENCONTRADO', 'El servicio del viaje no existe.')
    return { viaje, servicio, ocupados: [...(asientosOcupados[viajeId] ?? [])] }
  },

  async registrarOperacion(input) {
    await simularLatencia(400, 700)
    const store = useTicketingStore.getState()
    const viaje = store.viajes.find((v) => v.id === input.viajeId)
    if (!viaje) throw new ServiceError('NO_ENCONTRADO', 'El viaje no existe.')

    if (input.items.length === 0) {
      throw new ServiceError('VALIDACION', 'Selecciona al menos un asiento.')
    }
    if (input.items.length > MAX_ASIENTOS_OPERACION) {
      throw new ServiceError('VALIDACION', `Una operación admite como máximo ${MAX_ASIENTOS_OPERACION} asientos.`)
    }
    const asientosPedidos = new Set(input.items.map((i) => i.asiento))
    if (asientosPedidos.size !== input.items.length) {
      throw new ServiceError('VALIDACION', 'Hay asientos duplicados en la operación.')
    }

    // Reglas de negocio (el backend real las repite; la UI las valida antes).
    const total = viaje.tarifa * input.items.length
    if (input.pago.monto !== total) {
      throw new ServiceError('VALIDACION', 'El monto del pago no coincide con el total de la operación.')
    }
    const metodoRequiereReferencia = input.pago.metodoPagoId !== 'efectivo'
    if (metodoRequiereReferencia && !input.pago.referencia) {
      throw new ServiceError('VALIDACION', 'El método de pago requiere un código de referencia.')
    }
    let vuelto: number | undefined
    if (input.pago.metodoPagoId === 'efectivo') {
      const recibido = input.pago.montoRecibido ?? 0
      if (recibido < total) {
        throw new ServiceError('VALIDACION', 'El monto recibido no cubre el total de la operación.')
      }
      vuelto = recibido - total
    }

    // Simulación de venta concurrente en otra ventanilla (ver comentario arriba).
    const claveConflicto = `${viaje.id}:${ASIENTO_CONFLICTO_SIMULADO}`
    if (asientosPedidos.has(ASIENTO_CONFLICTO_SIMULADO) && !conflictosSimulados.has(claveConflicto)) {
      conflictosSimulados.add(claveConflicto)
      const otra = pasajerosMock[0]
      store.emitirOperacion({
        viajeId: viaje.id,
        items: [
          {
            asiento: ASIENTO_CONFLICTO_SIMULADO,
            pasajero: {
              tipoDocumento: otra.tipoDocumento,
              numeroDocumento: otra.numeroDocumento,
              nombres: otra.nombres,
              apellidos: otra.apellidos,
              telefono: otra.telefono,
            },
          },
        ],
        pago: { metodoPagoId: 'efectivo', monto: viaje.tarifa, montoRecibido: viaje.tarifa },
        vuelto: 0,
        agenciaVentaId: viaje.agenciaId,
      })
    }

    const resultado = useTicketingStore.getState().emitirOperacion({
      viajeId: input.viajeId,
      items: input.items,
      pago: input.pago,
      vuelto,
      agenciaVentaId: input.agenciaVentaId,
    })

    if (!resultado.ok) {
      if (resultado.motivo === 'ASIENTO_OCUPADO') {
        throw new ServiceError(
          'ASIENTO_OCUPADO',
          `El asiento ${resultado.asientoConflicto} acaba de ser vendido en otra ventanilla.`,
          { asiento: resultado.asientoConflicto },
        )
      }
      if (resultado.motivo === 'NO_VENDIBLE') {
        throw new ServiceError('VIAJE_NO_VENDIBLE', 'El viaje ya no tiene suficientes asientos disponibles.')
      }
      throw new ServiceError('NO_ENCONTRADO', 'El viaje no existe.')
    }

    const servicio = serviciosMock.find((s) => s.id === resultado.viaje.servicioId)
    const agenciaVenta = agenciasMock.find((a) => a.id === input.agenciaVentaId)
    const agenciaViaje = agenciasMock.find((a) => a.id === resultado.viaje.agenciaId)
    if (!servicio || !agenciaVenta || !agenciaViaje) {
      throw new ServiceError('DESCONOCIDO', 'Datos de catálogo inconsistentes.')
    }

    const boletos: ComprobantePasaje[] = resultado.pasajes.map((pasaje) => {
      const pasajero = resultado.pasajeros.find((p) => p.id === pasaje.pasajeroId)
      if (!pasajero) throw new ServiceError('DESCONOCIDO', 'No se encontró el pasajero del boleto.')
      return {
        pasaje,
        pasajero,
        viaje: resultado.viaje,
        servicio,
        agenciaVenta,
        agenciaViaje,
        codigoAsiento: codigoDeAsiento(pasaje.asiento, servicio.distribucion),
      }
    })

    return {
      operacionId: resultado.operacionId,
      boletos,
      cantidadPasajes: boletos.length,
      totalPagado: total,
    }
  },
}
