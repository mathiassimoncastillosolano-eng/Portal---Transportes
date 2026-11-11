import { FECHA_REFERENCIA } from '@/config/referencia'
import { diaSemana, diferenciaDias, sumarDias } from '@/utils/fechas'
import type { Pasaje } from '@/types/pasaje'
import type { MetodoPagoId } from '@/types/pago'
import { agenciasMock } from './agencias'
import { pasajerosMock } from './pasajeros'
import { HISTORIA_INICIO, viajesSemilla } from './viajes'
import { crearPrng, elegir, elegirPonderado, entero, muestraDeAsientos, pad } from './semilla'

const AJUSTE_SERVICIO: Record<string, number> = { economico: 0.08, ejecutivo: 0.02, directo: 0, vip: -0.08 }
const AJUSTE_RUTA: Record<string, number> = {
  'lim-aqp': 0.08, 'aqp-lim': 0.06, 'lim-cuz': 0.06, 'cuz-lim': 0.04, 'lim-tru': 0.03,
  'lim-tcq': -0.06, 'lim-piu': -0.02, 'aqp-cuz': 0,
}

const METODOS: { valor: MetodoPagoId; peso: number }[] = [
  { valor: 'efectivo', peso: 40 },
  { valor: 'yape-plin', peso: 28 },
  { valor: 'tarjeta', peso: 20 },
  { valor: 'transferencia', peso: 12 },
]

function generar(): Pasaje[] {
  const rng = crearPrng(58141)
  const total = diferenciaDias(HISTORIA_INICIO, FECHA_REFERENCIA)
  const borradores: Omit<Pasaje, 'id' | 'codigo' | 'operacionId'>[] = []

  for (const viaje of viajesSemilla) {
    if (viaje.estado === 'cancelado') continue

    const diasAdelante = diferenciaDias(FECHA_REFERENCIA, viaje.fecha) // >0 = futuro
    const esFuturo = diasAdelante >= 0
    const progreso = Math.max(0, Math.min(1, diferenciaDias(HISTORIA_INICIO, viaje.fecha) / total))
    const finDeSemana = [0, 5, 6].includes(diaSemana(viaje.fecha))

    let ocupacion =
      0.28 + rng() * 0.3 +
      (finDeSemana ? 0.14 : 0) +
      0.1 * progreso + // leve crecimiento del negocio en el período
      (AJUSTE_SERVICIO[viaje.servicioId] ?? 0) +
      (AJUSTE_RUTA[viaje.rutaId] ?? 0)
    ocupacion = Math.max(0.1, Math.min(1, ocupacion))
    if (rng() < 0.05) ocupacion = 1

    // Viajes cercanos programados: algunos ya agotados (caso "viaje sin asientos").
    const agotado = esFuturo && diasAdelante <= 4 && rng() < 0.1
    const cantidad = agotado ? viaje.capacidad : Math.round(viaje.capacidad * ocupacion)
    const asientos = muestraDeAsientos(rng, viaje.capacidad, cantidad)

    for (const asiento of asientos) {
      // Anticipación de la compra: la mayoría se vende pocos días antes de salir.
      // Los viajes agotados se vendieron durante la última semana (hasta la fecha de referencia).
      const emisionDia = agotado
        ? sumarDias(FECHA_REFERENCIA, -entero(rng, 0, 6))
        : sumarDias(viaje.fecha, -Math.min(14, Math.floor(-3 * Math.log(1 - rng()))))

      if (emisionDia > FECHA_REFERENCIA || emisionDia < HISTORIA_INICIO) continue

      const metodoPagoId = elegirPonderado(rng, METODOS)
      const agenciaVentaId =
        rng() < 0.78 ? viaje.agenciaId : elegir(rng, agenciasMock).id
      const hora = `${pad(entero(rng, 6, 21), 2)}:${pad(entero(rng, 0, 59), 2)}:${pad(entero(rng, 0, 59), 2)}`

      borradores.push({
        viajeId: viaje.id,
        pasajeroId: elegir(rng, pasajerosMock).id,
        asiento,
        servicioId: viaje.servicioId,
        precio: viaje.tarifa,
        metodoPagoId,
        referenciaPago: metodoPagoId === 'efectivo' ? undefined : `OP-${pad(entero(rng, 0, 99_999_999), 8)}`,
        fechaEmision: `${emisionDia}T${hora}`,
        estado: !esFuturo && rng() < 0.02 ? 'anulado' : 'emitido',
        agenciaVentaId,
      })
    }
  }

  borradores.sort((a, b) => a.fechaEmision.localeCompare(b.fechaEmision))
  // Semilla histórica: se simplifica asumiendo una operación de un asiento por pasaje.
  return borradores.map((p, i) => ({
    ...p,
    id: `ps-${i + 1}`,
    codigo: `RL-PS-${pad(i + 1, 6)}`,
    operacionId: `RL-OP-${pad(i + 1, 6)}`,
  }))
}

export const pasajesMock: Pasaje[] = generar()
