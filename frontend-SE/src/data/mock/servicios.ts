import type { Servicio } from '@/types/servicio'

/**
 * Catálogo de servicios (semilla rescatada del antiguo Recomendador).
 * Tarifa base = precio de referencia en la ruta Lima–Arequipa.
 */
export const serviciosMock: Servicio[] = [
  {
    id: 'economico',
    nombre: 'Económico',
    tipoUnidad: 'bus-1-piso',
    unidad: 'Bus 1 piso',
    distribucion: { pisos: [{ piso: 1, filas: 10, patron: [2, 2] }] },
    tarifaBase: 58,
  },
  {
    id: 'ejecutivo',
    nombre: 'Ejecutivo',
    tipoUnidad: 'bus-2-pisos',
    unidad: 'Bus 2 pisos',
    distribucion: {
      pisos: [
        { piso: 1, filas: 3, patron: [2, 2] },
        { piso: 2, filas: 9, patron: [2, 2] },
      ],
    },
    tarifaBase: 85,
  },
  {
    id: 'directo',
    nombre: 'Directo',
    tipoUnidad: 'bus-2-pisos',
    unidad: 'Bus 2 pisos',
    distribucion: {
      pisos: [
        { piso: 1, filas: 4, patron: [2, 2] },
        { piso: 2, filas: 9, patron: [2, 2] },
      ],
    },
    tarifaBase: 92,
  },
  {
    id: 'vip',
    nombre: 'VIP',
    tipoUnidad: 'bus-vip',
    unidad: 'Bus VIP 3 asientos/fila',
    distribucion: { pisos: [{ piso: 1, filas: 10, patron: [1, 2] }] },
    tarifaBase: 110,
  },
]
