const base = new Date()

function aIso(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

function desplazar(dias) {
  const fecha = new Date(base)
  fecha.setDate(fecha.getDate() + dias)
  return fecha
}

export const FECHA_VIAJE = aIso(desplazar(4))
export const FECHA_COMPRA = aIso(desplazar(-2))
export const FECHA_PASADA = aIso(desplazar(-30))

export const USUARIO_DEMO = {
  nombres: 'María Fernanda',
  apellidos: 'Torres Quispe',
  correo: 'maria.torres@correo.com',
  telefono: '987654321',
}

export const CIUDADES_DEMO = ['Lima', 'Trujillo', 'Chiclayo', 'Piura', 'Arequipa']

export const RESULTADOS_DEMO = [
  {
    id: 'demo-1',
    empresa: 'RutaLibre',
    tipoBus: 'Semi Cama',
    origen: 'Lima',
    destino: 'Trujillo',
    fechaSalida: FECHA_VIAJE,
    fechaLlegada: FECHA_VIAJE,
    horaSalida: '14:30',
    horaLlegada: '21:45',
    duracion: '7 h 15 min',
    servicios: ['WiFi', 'Baño', 'USB'],
    precio: 45,
    estado: 'disponible',
    asientosDisponibles: 18,
    franja: 'tarde',
  },
  {
    id: 'demo-2',
    empresa: 'RutaLibre',
    tipoBus: 'Cama',
    origen: 'Lima',
    destino: 'Trujillo',
    fechaSalida: FECHA_VIAJE,
    fechaLlegada: FECHA_VIAJE,
    horaSalida: '21:00',
    horaLlegada: '04:30',
    duracion: '7 h 30 min',
    servicios: ['WiFi', 'Baño', 'TV', 'Snack'],
    precio: 70,
    estado: 'pocos-asientos',
    asientosDisponibles: 3,
    franja: 'noche',
  },
  {
    id: 'demo-3',
    empresa: 'RutaLibre',
    tipoBus: 'Económico',
    origen: 'Lima',
    destino: 'Trujillo',
    fechaSalida: FECHA_VIAJE,
    fechaLlegada: FECHA_VIAJE,
    horaSalida: '09:15',
    horaLlegada: '16:45',
    duracion: '7 h 30 min',
    servicios: ['Baño'],
    precio: 30,
    estado: 'disponible',
    asientosDisponibles: 26,
    franja: 'mañana',
  },
]

export const SERVICIOS_DEMO = ['Económico', 'Semi Cama', 'Cama']

const OCUPADOS = new Set(['1-izquierda-1', '1-derecha-2', '2-izquierda-2', '3-izquierda-1', '4-derecha-1', '4-izquierda-2'])
const BLOQUEADOS = new Set(['2-derecha-1'])

export function asientosDemo(piso, seleccionados = []) {
  const lista = []
  let numero = piso === 2 ? 21 : 1
  for (let fila = 1; fila <= 5; fila += 1) {
    for (const lado of ['izquierda', 'derecha']) {
      for (let columna = 1; columna <= 2; columna += 1) {
        const clave = `${fila}-${lado}-${columna}`
        const ocupado = piso === 1 && OCUPADOS.has(clave)
        const bloqueado = piso === 1 && BLOQUEADOS.has(clave)
        lista.push({
          idAsiento: `${piso}-${numero}`,
          numero,
          fila,
          lado,
          piso,
          estado: ocupado ? 'ocupado' : bloqueado ? 'bloqueado' : 'disponible',
          esMio: columna === 1 && seleccionados.includes(`${fila}-${lado}`),
          precio: 45,
        })
        numero += 1
      }
    }
  }
  return lista
}

export const COMPRA_DEMO = {
  idVenta: 'demo',
  codigoCompra: 'RL-482913',
  comprobante: 'B001-000482',
  estado: 'CONFIRMADA',
  fase: 'PROXIMO',
  vigente: true,
  documentoDisponible: true,
  origen: 'Lima',
  destino: 'Trujillo',
  fechaSalida: FECHA_VIAJE,
  horaSalida: '14:30',
  tipoBus: 'Semi Cama',
  moneda: 'PEN',
  total: 45,
  totalPagado: 45,
  totalConsistente: true,
  fechaCompra: FECHA_COMPRA,
  boletos: [
    {
      idPasaje: 'demo-boleto-1',
      numeroBoleto: 'RL-0001-482913',
      asiento: '7',
      pasajero: 'María Fernanda Torres Quispe',
      documento: 'DNI 45871236',
      precio: 45,
    },
  ],
}

export const COMPRA_REALIZADA_DEMO = {
  ...COMPRA_DEMO,
  idVenta: 'demo-realizada',
  codigoCompra: 'RL-391204',
  fase: 'REALIZADO',
  vigente: false,
  fechaSalida: FECHA_PASADA,
  horaSalida: '21:00',
  tipoBus: 'Cama',
  total: 70,
  totalPagado: 70,
  boletos: [{ ...COMPRA_DEMO.boletos[0], idPasaje: 'demo-boleto-2', numeroBoleto: 'RL-0001-391204', asiento: '12', precio: 70 }],
}

export const COMPRA_CANCELADA_DEMO = {
  ...COMPRA_REALIZADA_DEMO,
  idVenta: 'demo-cancelada',
  codigoCompra: 'RL-355871',
  fase: 'NO_REALIZADO',
  estadoViaje: 'CANCELADO',
  fechaSalida: aIso(desplazar(-60)),
  horaSalida: '06:30',
  tipoBus: 'Económico',
  total: 30,
  totalPagado: 30,
  boletos: [{ ...COMPRA_DEMO.boletos[0], idPasaje: 'demo-boleto-3', numeroBoleto: 'RL-0001-355871', asiento: '4', precio: 30 }],
}
