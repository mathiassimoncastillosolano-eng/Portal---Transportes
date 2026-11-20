import { formatearDuracion } from '@/features/ticketing/utils/viajes'
import type { ViajeHistorial } from '@/types/cliente'
import type { AsientoConsulta, EstadoReserva, MapaAsientosConsulta, PisoConsulta, RutaCiudad, ViajeConsulta } from '@/types/consultaViaje'
import { sumarDias } from '@/utils/fechas'
import { esMismaRuta, esMismoViaje, salidaMs, validarElegibilidad, type Elegibilidad, type MetodoCambio, type ResultadoTerminal } from './reglas'

type DatosPasaje = Pick<ViajeHistorial, 'origen' | 'destino' | 'fechaSalida' | 'horaSalida' | 'precio'>

interface Disposicion {
  factor: number
  servicios: string[]
  pisos: { filas: number; lados: [number, number] }[]
}

const CIUDADES = ['Lima', 'Trujillo', 'Chiclayo', 'Piura', 'Chimbote', 'Cajamarca', 'Arequipa', 'Cusco', 'Tumbes', 'Huaraz']

const DISPOSICIONES: Record<string, Disposicion> = {
  Estándar: { factor: 0.85, servicios: ['Aire acondicionado'], pisos: [{ filas: 10, lados: [2, 2] }] },
  'Semi Cama': { factor: 1, servicios: ['Asiento reclinable', 'Aire acondicionado'], pisos: [{ filas: 9, lados: [2, 2] }] },
  'Bus Cama': {
    factor: 1.25,
    servicios: ['Cama 160°', 'Manta y almohada', 'Baño a bordo'],
    pisos: [
      { filas: 4, lados: [2, 1] },
      { filas: 6, lados: [2, 1] },
    ],
  },
  Prime: { factor: 1.5, servicios: ['Cama 180°', 'Comida a bordo', 'Pantalla personal'], pisos: [{ filas: 8, lados: [1, 2] }] },
}

const SALIDAS: { hora: string; tipo: string }[] = [
  { hora: '06:30', tipo: 'Estándar' },
  { hora: '09:15', tipo: 'Semi Cama' },
  { hora: '13:00', tipo: 'Estándar' },
  { hora: '16:45', tipo: 'Semi Cama' },
  { hora: '20:30', tipo: 'Bus Cama' },
  { hora: '22:15', tipo: 'Prime' },
  { hora: '23:30', tipo: 'Bus Cama' },
]

const MINUTOS_ANTICIPACION = 30
const RECARGO_SEGUNDO_PISO = 8

function semilla(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function aleatorio(inicio: number): () => number {
  let a = inicio >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => window.setTimeout(resolver, ms))
}

function dos(n: number): string {
  return String(n).padStart(2, '0')
}

function precioBase(pasaje: DatosPasaje, origen: string, destino: string): number {
  if (esMismaRuta(pasaje, origen, destino)) return pasaje.precio ?? 60
  return 30 + (semilla([origen, destino].sort().join('>')) % 70)
}

function precioAsiento(base: number, tipo: string, piso: number): number {
  const recargo = tipo === 'Bus Cama' && piso === 2 ? RECARGO_SEGUNDO_PISO : 0
  return Math.round(base * DISPOSICIONES[tipo].factor) + recargo
}

function construirMapa(pasaje: DatosPasaje, idViaje: number, origen: string, destino: string, tipo: string): MapaAsientosConsulta {
  const disposicion = DISPOSICIONES[tipo]
  const base = precioBase(pasaje, origen, destino)
  const azar = aleatorio(idViaje)
  const ocupacion = 0.2 + azar() * 0.55
  const lleno = idViaje % 7 === 0
  let numero = 0

  const porPiso: PisoConsulta[] = disposicion.pisos.map((plantilla, indice) => {
    const piso = indice + 1
    const asientos: AsientoConsulta[] = []
    for (let fila = 1; fila <= plantilla.filas; fila += 1) {
      for (const lado of ['izquierda', 'derecha'] as const) {
        const cantidad = lado === 'izquierda' ? plantilla.lados[0] : plantilla.lados[1]
        for (let k = 0; k < cantidad; k += 1) {
          numero += 1
          const sorteo = azar()
          asientos.push({
            idAsiento: idViaje * 100 + numero,
            numero: String(numero),
            fila,
            letra: (lado === 'izquierda' ? 'AB' : 'CD')[k],
            lado,
            piso,
            estado: lleno || sorteo < ocupacion ? 'ocupado' : sorteo > 0.97 ? 'bloqueado' : 'disponible',
            precio: precioAsiento(base, tipo, piso),
            esMio: false,
          })
        }
      }
    }
    return { piso, filas: plantilla.filas, asientosPorLado: plantilla.lados, descripcion: `Piso ${piso}`, asientos }
  })

  return { pisos: porPiso.length, porPiso }
}

function estadoDeReserva(salida: number, disponibles: number, ahora: number): EstadoReserva {
  if (salida <= ahora) return 'SALIDA_REALIZADA'
  if (disponibles === 0) return 'LLENO'
  if (ahora > salida - MINUTOS_ANTICIPACION * 60_000) return 'RESERVA_CERRADA'
  return 'DISPONIBLE'
}

export function rutasMock(pasaje: Pick<ViajeHistorial, 'origen' | 'destino'>): RutaCiudad[] {
  const ciudades = [...new Set([...CIUDADES, pasaje.origen, pasaje.destino])]
  return ciudades.flatMap((origen) => ciudades.filter((destino) => destino !== origen).map((destino) => ({ origen, destino })))
}

export async function consultarElegibilidadMock(pasaje: ViajeHistorial): Promise<Elegibilidad> {
  await esperar(550)
  return validarElegibilidad(pasaje, Date.now())
}

export async function buscarViajesMock(
  pasaje: DatosPasaje,
  criterios: { origen: string; destino: string; fecha: string },
): Promise<ViajeConsulta[]> {
  await esperar(500)
  const ahora = Date.now()
  const duracionMin = 240 + (semilla([criterios.origen, criterios.destino].sort().join('>')) % 420)

  return SALIDAS.filter(
    (s) => !esMismoViaje(pasaje, { origen: criterios.origen, destino: criterios.destino, fechaSalida: criterios.fecha, horaSalida: s.hora }),
  ).map((s) => {
    const id = (semilla(`${criterios.origen}|${criterios.destino}|${criterios.fecha}|${s.hora}`) % 900000) + 100000
    const mapa = construirMapa(pasaje, id, criterios.origen, criterios.destino, s.tipo)
    const asientos = mapa.porPiso.flatMap((p) => p.asientos)
    const libres = asientos.filter((a) => a.estado === 'disponible')
    const salida = salidaMs(criterios.fecha, s.hora)
    const estadoReserva = estadoDeReserva(salida, libres.length, ahora)
    const [hora, minuto] = s.hora.split(':').map(Number)
    const total = hora * 60 + minuto + duracionMin
    const resto = total % 1440

    return {
      id,
      empresa: 'RutaLibre',
      origen: criterios.origen,
      destino: criterios.destino,
      fechaSalida: criterios.fecha,
      horaSalida: s.hora,
      horaLlegada: `${dos(Math.floor(resto / 60))}:${dos(resto % 60)}`,
      fechaLlegada: sumarDias(criterios.fecha, Math.floor(total / 1440)),
      duracion: formatearDuracion(duracionMin),
      duracionMin,
      tipoBus: s.tipo,
      servicios: DISPOSICIONES[s.tipo].servicios,
      capacidad: asientos.length,
      terminalOrigen: `Terminal ${criterios.origen}`,
      terminalDestino: `Terminal ${criterios.destino}`,
      asientosDisponibles: libres.length,
      precio: libres.length > 0 ? Math.min(...libres.map((a) => a.precio ?? Infinity)) : precioAsiento(precioBase(pasaje, criterios.origen, criterios.destino), s.tipo, 1),
      estado: libres.length === 0 ? 'agotado' : libres.length <= 5 ? 'pocos-asientos' : 'disponible',
      estadoReserva,
      reservable: estadoReserva === 'DISPONIBLE',
      salidaMs: salida,
      limiteReservaMs: salida - MINUTOS_ANTICIPACION * 60_000,
      ahoraServidorMs: ahora,
      minutosAnticipacion: MINUTOS_ANTICIPACION,
    }
  })
}

export async function obtenerMapaMock(pasaje: DatosPasaje, viaje: ViajeConsulta): Promise<MapaAsientosConsulta> {
  await esperar(400)
  return construirMapa(pasaje, viaje.id, viaje.origen, viaje.destino, viaje.tipoBus)
}

export async function registrarPagoMock(
  metodo: MetodoCambio,
  resultado: ResultadoTerminal,
): Promise<{ estado: ResultadoTerminal; referencia: string | null }> {
  await esperar(900)
  const estado = metodo === 'EFECTIVO' ? 'APROBADO' : resultado
  return { estado, referencia: estado === 'APROBADO' ? `PA-${100000 + Math.floor(Math.random() * 899999)}` : null }
}

export async function confirmarPostergacionMock(): Promise<void> {
  await esperar(900)
}
