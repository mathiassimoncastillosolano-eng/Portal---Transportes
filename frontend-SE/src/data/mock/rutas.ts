import type { Ruta } from '@/types/viaje'

/**
 * Rutas y salidas diarias. `factorTarifa` multiplica la tarifa base del
 * servicio (ruta Lima–Arequipa = 1.00). Las horas y servicios provienen del
 * catálogo del antiguo Recomendador (07:30 Ejecutivo, 09:00 Económico, etc.).
 */
export const rutasMock: Ruta[] = [
  {
    id: 'lim-aqp', origen: 'Lima', destino: 'Arequipa', factorTarifa: 1.0, duracionMin: 920,
    salidas: [
      { hora: '07:30', servicioId: 'ejecutivo' },
      { hora: '14:15', servicioId: 'economico' },
      { hora: '21:00', servicioId: 'vip' },
    ],
  },
  {
    id: 'aqp-lim', origen: 'Arequipa', destino: 'Lima', factorTarifa: 1.0, duracionMin: 900,
    salidas: [
      { hora: '09:00', servicioId: 'economico' },
      { hora: '20:30', servicioId: 'ejecutivo' },
    ],
  },
  {
    id: 'lim-cuz', origen: 'Lima', destino: 'Cusco', factorTarifa: 1.18, duracionMin: 1260,
    salidas: [
      { hora: '13:30', servicioId: 'directo' },
      { hora: '18:00', servicioId: 'economico' },
      { hora: '20:00', servicioId: 'vip' },
    ],
  },
  {
    id: 'cuz-lim', origen: 'Cusco', destino: 'Lima', factorTarifa: 1.18, duracionMin: 1240,
    salidas: [
      { hora: '15:00', servicioId: 'ejecutivo' },
      { hora: '19:30', servicioId: 'economico' },
    ],
  },
  {
    id: 'lim-tru', origen: 'Lima', destino: 'Trujillo', factorTarifa: 0.55, duracionMin: 500,
    salidas: [
      { hora: '08:00', servicioId: 'economico' },
      { hora: '22:00', servicioId: 'ejecutivo' },
    ],
  },
  {
    id: 'tru-lim', origen: 'Trujillo', destino: 'Lima', factorTarifa: 0.55, duracionMin: 490,
    salidas: [{ hora: '22:30', servicioId: 'economico' }],
  },
  {
    id: 'aqp-cuz', origen: 'Arequipa', destino: 'Cusco', factorTarifa: 0.6, duracionMin: 600,
    salidas: [
      { hora: '10:30', servicioId: 'economico' },
      { hora: '21:30', servicioId: 'ejecutivo' },
    ],
  },
  {
    id: 'lim-piu', origen: 'Lima', destino: 'Piura', factorTarifa: 0.95, duracionMin: 960,
    salidas: [
      { hora: '17:00', servicioId: 'directo' },
      { hora: '19:30', servicioId: 'vip' },
    ],
  },
  {
    id: 'lim-tcq', origen: 'Lima', destino: 'Tacna', factorTarifa: 1.22, duracionMin: 1200,
    salidas: [{ hora: '16:00', servicioId: 'economico' }],
  },
]
