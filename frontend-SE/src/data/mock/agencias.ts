import type { Agencia } from '@/types/agency'

/** Sedes de venta/operación. Son las mismas entidades que agrupa el Dashboard. */
export const agenciasMock: Agencia[] = [
  { id: 'lim-norte', name: 'Terminal Lima Norte', location: 'Lima, Perú', city: 'Lima', code: 'LIM', status: 'activa' },
  { id: 'lim-sur', name: 'Terminal Lima Sur', location: 'Lima, Perú', city: 'Lima', code: 'LMS', status: 'activa' },
  { id: 'aqp-terrestre', name: 'Terminal Terrestre Arequipa', location: 'Arequipa, Perú', city: 'Arequipa', code: 'AQP', status: 'activa' },
  { id: 'cuz-centro', name: 'Terminal Cusco', location: 'Cusco, Perú', city: 'Cusco', code: 'CUZ', status: 'activa' },
  { id: 'tru-centro', name: 'Terminal Trujillo', location: 'Trujillo, Perú', city: 'Trujillo', code: 'TRU', status: 'activa' },
  { id: 'pur-centro', name: 'Terminal Piura', location: 'Piura, Perú', city: 'Piura', code: 'PIU', status: 'activa' },
  { id: 'tcq-centro', name: 'Terminal Tacna', location: 'Tacna, Perú', city: 'Tacna', code: 'TCQ', status: 'activa' },
]
