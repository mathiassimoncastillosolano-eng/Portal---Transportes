import { useTicketingStore } from '@/stores/ticketingStore'
import { diferenciaDias, sumarDias } from '@/utils/fechas'
import type { PeriodoDatos, VentaFact } from '@/types/dashboard'
import type { DashboardService } from '../contracts'
import { simularLatencia } from './latencia'

/**
 * Entrega los hechos de venta (sin identificar pasajeros) del período y del
 * período anterior comparable, ya filtrados por agencia de venta, servicio y
 * destino. La ocupación considera solo viajes finalizados con ventas (un viaje
 * programado aún está vendiéndose). Todo sale de los mismos pasajes y viajes que alimentan el registro.
 * Las agregaciones (KPIs, series, rankings) son funciones puras del feature.
 */
export const dashboardServiceMock: DashboardService = {
  async obtenerDashboard(consulta) {
    await simularLatencia()
    const { pasajes, viajes } = useTicketingStore.getState()
    const viajePorId = new Map(viajes.map((v) => [v.id, v]))

    const { desde, hasta } = consulta.rango
    const largo = diferenciaDias(desde, hasta) + 1
    const rangoAnterior = { desde: sumarDias(desde, -largo), hasta: sumarDias(desde, -1) }

    const actual: PeriodoDatos = { rango: consulta.rango, ventas: [], viajes: [] }
    const anterior: PeriodoDatos = { rango: rangoAnterior, ventas: [], viajes: [] }
    const viajesActual = new Set<string>()
    const viajesAnterior = new Set<string>()

    for (const p of pasajes) {
      const fecha = p.fechaEmision.slice(0, 10)
      const enActual = fecha >= desde && fecha <= hasta
      const enAnterior = !enActual && fecha >= rangoAnterior.desde && fecha <= rangoAnterior.hasta
      if (!enActual && !enAnterior) continue

      const viaje = viajePorId.get(p.viajeId)
      if (!viaje) continue
      if (consulta.agenciaId && p.agenciaVentaId !== consulta.agenciaId) continue
      if (consulta.servicioId && viaje.servicioId !== consulta.servicioId) continue
      if (consulta.destino && viaje.destino !== consulta.destino) continue

      const venta: VentaFact = {
        viajeId: viaje.id,
        fecha,
        ingreso: p.precio,
        estado: p.estado,
        agenciaId: p.agenciaVentaId,
        servicioId: viaje.servicioId,
        origen: viaje.origen,
        destino: viaje.destino,
      }
      if (enActual) {
        actual.ventas.push(venta)
        if (p.estado === 'emitido' && viaje.estado === 'finalizado') viajesActual.add(viaje.id)
      } else {
        anterior.ventas.push(venta)
        if (p.estado === 'emitido' && viaje.estado === 'finalizado') viajesAnterior.add(viaje.id)
      }
    }

    const ocupacion = (ids: Set<string>) =>
      [...ids].map((id) => {
        const v = viajePorId.get(id)!
        return { viajeId: id, capacidad: v.capacidad, vendidos: v.asientosOcupados }
      })
    actual.viajes = ocupacion(viajesActual)
    anterior.viajes = ocupacion(viajesAnterior)

    return { actual, anterior }
  },
}
