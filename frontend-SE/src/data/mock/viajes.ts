import { DIAS_HISTORIA, FECHA_REFERENCIA } from '@/config/referencia'
import { diaSemana, listarDias, sumarDias } from '@/utils/fechas'
import { capacidadDe } from '@/utils/asientos'
import type { Viaje } from '@/types/viaje'
import { rutasMock } from './rutas'
import { serviciosMock } from './servicios'
import { agenciasMock } from './agencias'
import { crearPrng, pad } from './semilla'

/** Viaje sin contadores de ocupación: se calculan al ensamblar la semilla (ver `index.ts`). */
export type ViajeSemilla = Omit<Viaje, 'asientosOcupados' | 'asientosDisponibles'>

/** Días a futuro con viajes programados. */
export const DIAS_FUTURO = 14

export const HISTORIA_INICIO = sumarDias(FECHA_REFERENCIA, -(DIAS_HISTORIA - 1))

function agenciaDeSalida(origen: string, rutaIdx: number, salidaIdx: number): string {
  const enCiudad = agenciasMock.filter((a) => a.city === origen)
  if (enCiudad.length === 1) return enCiudad[0].id
  // Lima tiene dos terminales: se alternan las salidas entre ambas.
  return enCiudad[(rutaIdx + salidaIdx) % enCiudad.length].id
}

function generar(): ViajeSemilla[] {
  const rng = crearPrng(24092026)
  const dias = listarDias(HISTORIA_INICIO, sumarDias(FECHA_REFERENCIA, DIAS_FUTURO))
  const resultado: Omit<ViajeSemilla, 'id' | 'codigo'>[] = []

  for (const fecha of dias) {
    const finDeSemana = [0, 5, 6].includes(diaSemana(fecha))
    const probOperar = finDeSemana ? 0.85 : 0.65
    const esFuturo = fecha >= FECHA_REFERENCIA

    rutasMock.forEach((ruta, rutaIdx) => {
      ruta.salidas.forEach((salida, salidaIdx) => {
        if (rng() > probOperar) return
        const servicio = serviciosMock.find((s) => s.id === salida.servicioId)
        if (!servicio) return
        const cancelado = rng() < (esFuturo ? 0.025 : 0.03)
        resultado.push({
          rutaId: ruta.id,
          origen: ruta.origen,
          destino: ruta.destino,
          fecha,
          hora: salida.hora,
          agenciaId: agenciaDeSalida(ruta.origen, rutaIdx, salidaIdx),
          servicioId: servicio.id,
          capacidad: capacidadDe(servicio.distribucion),
          estado: cancelado ? 'cancelado' : esFuturo ? 'programado' : 'finalizado',
          tarifa: Math.round(servicio.tarifaBase * ruta.factorTarifa),
        })
      })
    })
  }

  resultado.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
  return resultado.map((v, i) => ({
    ...v,
    id: `vj-${i + 1}`,
    codigo: `RL-VJ-${pad(i + 1, 6)}`,
  }))
}

export const viajesSemilla: ViajeSemilla[] = generar()
