import { fechaLocal } from '../../utilidades/fechas.js'
import { salidaMsDe } from '../../utilidades/postergacion.js'

const MINUTOS_LIMITE_RESERVA = 20

const RUTAS = [
  { origen: 'Trujillo', destino: 'Lima', base: 45, minutos: 540 },
  { origen: 'Lima', destino: 'Trujillo', base: 45, minutos: 540 },
  { origen: 'Trujillo', destino: 'Chiclayo', base: 25, minutos: 210 },
  { origen: 'Chiclayo', destino: 'Trujillo', base: 25, minutos: 210 },
  { origen: 'Lima', destino: 'Arequipa', base: 70, minutos: 960 },
  { origen: 'Arequipa', destino: 'Lima', base: 70, minutos: 960 },
]

const SERVICIOS = {
  Económico: { multiplicador: 1, servicios: ['Baño', 'USB'], pisos: [11] },
  'Semi cama': { multiplicador: 1.35, servicios: ['WiFi', 'Baño', 'USB', 'TV'], pisos: [10] },
  Cama: { multiplicador: 1.8, servicios: ['WiFi', 'Baño', 'USB', 'Snack', 'Cabina privada'], pisos: [5, 8] },
}

const FRANJAS = [
  { hora: '07:30', tipoBus: 'Económico', empresa: 'Costa Norte' },
  { hora: '13:00', tipoBus: 'Semi cama', empresa: 'RutaLibre Express' },
  { hora: '19:30', tipoBus: 'Cama', empresa: 'Andes Travel' },
  { hora: '22:15', tipoBus: 'Semi cama', empresa: 'RutaLibre Plus' },
]

const DESCRIPCION_PISO = { 1: 'Más espacio', 2: 'Mejores vistas' }
const ocupadosSimulados = new Map()

export const RUTAS_MOCK = Object.freeze(RUTAS.map(({ origen, destino }) => Object.freeze({ origen, destino })))
export const TIPOS_BUS_MOCK = Object.freeze(Object.keys(SERVICIOS))

function hash(texto) {
  let valor = 2166136261
  for (let i = 0; i < texto.length; i += 1) {
    valor ^= texto.charCodeAt(i)
    valor = Math.imul(valor, 16777619)
  }
  return valor >>> 0
}

function redondearA5(valor) {
  return Math.round(valor / 5) * 5
}

function formatearDuracion(minutos) {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas} h` : `${horas} h ${String(resto).padStart(2, '0')} min`
}

function formatearHora(fecha) {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`
}

export function idViajeMock(origen, destino, fechaSalida, horaSalida) {
  return `MV-${origen.slice(0, 3).toUpperCase()}-${destino.slice(0, 3).toUpperCase()}-${fechaSalida}-${horaSalida.replace(':', '')}`
}

export function precioBaseMock(origen, destino, tipoBus) {
  const ruta = RUTAS.find((r) => r.origen === origen && r.destino === destino)
  const servicio = SERVICIOS[tipoBus]
  if (!ruta || !servicio) return null
  return redondearA5(ruta.base * servicio.multiplicador)
}

export function horaLlegadaMock(origen, destino, fechaSalida, horaSalida) {
  const ruta = RUTAS.find((r) => r.origen === origen && r.destino === destino)
  if (!ruta) return null
  return formatearHora(new Date(salidaMsDe(fechaSalida, horaSalida) + ruta.minutos * 60_000))
}

export function estructuraAsientos(tipoBus) {
  const servicio = SERVICIOS[tipoBus] ?? SERVICIOS.Económico
  let numero = 0
  return servicio.pisos.map((filas, indice) => {
    const asientos = []
    for (let fila = 1; fila <= filas; fila += 1) {
      ;['A', 'B', 'C', 'D'].forEach((letra, posicion) => {
        numero += 1
        asientos.push({
          numero: String(numero),
          fila,
          letra,
          lado: posicion < 2 ? 'izquierda' : 'derecha',
          piso: indice + 1,
        })
      })
    }
    return { piso: indice + 1, filas, asientos }
  })
}

function asientoOcupadoBase(idViaje, numero) {
  const hashViaje = hash(idViaje)
  if (hashViaje % 7 === 0) return true
  const porcentaje = 20 + (hashViaje % 50)
  return hash(`${idViaje}|${numero}`) % 100 < porcentaje
}

export function asientoOcupado(idViaje, numero) {
  return asientoOcupadoBase(idViaje, numero) || Boolean(ocupadosSimulados.get(idViaje)?.has(String(numero)))
}

export function ocuparAsientoSimulado(idViaje, numero) {
  if (!ocupadosSimulados.has(idViaje)) ocupadosSimulados.set(idViaje, new Set())
  ocupadosSimulados.get(idViaje).add(String(numero))
}

function contarDisponibles(idViaje, tipoBus) {
  return estructuraAsientos(tipoBus)
    .flatMap((piso) => piso.asientos)
    .filter((asiento) => !asientoOcupado(idViaje, asiento.numero)).length
}

export function construirViaje(ruta, fechaSalida, franja) {
  const id = idViajeMock(ruta.origen, ruta.destino, fechaSalida, franja.hora)
  const salidaMs = salidaMsDe(fechaSalida, franja.hora)
  const llegada = new Date(salidaMs + ruta.minutos * 60_000)
  const disponibles = contarDisponibles(id, franja.tipoBus)
  return {
    id,
    empresa: franja.empresa,
    origen: ruta.origen,
    destino: ruta.destino,
    fechaSalida,
    horaSalida: franja.hora,
    fechaLlegada: fechaLocal(llegada),
    horaLlegada: formatearHora(llegada),
    duracion: formatearDuracion(ruta.minutos),
    tipoBus: franja.tipoBus,
    servicios: SERVICIOS[franja.tipoBus].servicios,
    asientosDisponibles: disponibles,
    precio: redondearA5(ruta.base * SERVICIOS[franja.tipoBus].multiplicador),
    estado: disponibles === 0 ? 'agotado' : disponibles <= 4 ? 'pocos-asientos' : 'disponible',
    estadoReserva: disponibles === 0 ? 'LLENO' : 'DISPONIBLE',
    salidaMs,
    limiteReservaMs: salidaMs - MINUTOS_LIMITE_RESERVA * 60_000,
  }
}

export function generarViajes(origen, destino, fechaSalida) {
  const ruta = RUTAS.find((r) => r.origen === origen && r.destino === destino)
  if (!ruta || !fechaSalida) return []
  return FRANJAS.map((franja) => construirViaje(ruta, fechaSalida, franja))
}

export function construirMapaAsientos(viaje, idAsientoSeleccionado = null) {
  const mapaPorPiso = {}
  estructuraAsientos(viaje.tipoBus).forEach((piso) => {
    mapaPorPiso[piso.piso] = {
      piso: piso.piso,
      filas: piso.filas,
      asientosPorLado: 2,
      descripcion: DESCRIPCION_PISO[piso.piso],
      asientos: piso.asientos.map((asiento) => {
        const idAsiento = `${viaje.id}-${asiento.numero}`
        const esMio = idAsiento === idAsientoSeleccionado
        return {
          idAsiento,
          numero: asiento.numero,
          fila: asiento.fila,
          letra: asiento.letra,
          lado: asiento.lado,
          piso: asiento.piso,
          estado: !esMio && asientoOcupado(viaje.id, asiento.numero) ? 'ocupado' : 'disponible',
          esMio,
          precio: viaje.precio,
        }
      }),
    }
  })
  return { pisos: Object.keys(mapaPorPiso).length, mapaPorPiso }
}
