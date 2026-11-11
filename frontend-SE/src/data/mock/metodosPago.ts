import type { MetodoPago } from '@/types/pago'

export const metodosPagoMock: MetodoPago[] = [
  { id: 'efectivo', nombre: 'Efectivo', requiereReferencia: false },
  { id: 'tarjeta', nombre: 'Tarjeta', requiereReferencia: true, etiquetaReferencia: 'Código de autorización' },
  { id: 'yape-plin', nombre: 'Yape/Plin', requiereReferencia: true, etiquetaReferencia: 'Código de operación' },
  { id: 'transferencia', nombre: 'Transferencia', requiereReferencia: true, etiquetaReferencia: 'N.º de operación' },
]
