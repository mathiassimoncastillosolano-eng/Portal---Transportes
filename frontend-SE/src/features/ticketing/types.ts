import type { MetodoPagoId } from '@/types/pago'
import { MAX_ASIENTOS_OPERACION } from '@/types/pasaje'
import type { TipoDocumento } from '@/types/pasajero'
import type { ServicioId } from '@/types/servicio'

export type PasoId = 'viaje' | 'asientos' | 'pasajeros' | 'pago' | 'revision' | 'confirmacion'

export const PASOS: { id: PasoId; label: string }[] = [
  { id: 'viaje', label: 'Viaje' },
  { id: 'asientos', label: 'Asientos' },
  { id: 'pasajeros', label: 'Pasajeros' },
  { id: 'pago', label: 'Pago' },
  // "revision" es el paso de verificación previo a emitir: en el stepper se muestra como "Confirmación".
  { id: 'revision', label: 'Confirmación' },
  { id: 'confirmacion', label: 'Registrado' },
]

/** De 1 a 6 asientos por operación (ver sección "Reglas de negocio" del README). */
export const MAX_ASIENTOS = MAX_ASIENTOS_OPERACION
export const MIN_ASIENTOS = 1

/** Valores de formulario: siempre texto, se convierten al validar. Uno por asiento seleccionado. */
export interface PasajeroForm {
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  nombres: string
  apellidos: string
  telefono: string
  email: string
}

export const pasajeroFormVacio: PasajeroForm = {
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  nombres: '',
  apellidos: '',
  telefono: '',
  email: '',
}

export interface PagoForm {
  metodoPagoId: MetodoPagoId | ''
  montoRecibido: string
  referencia: string
}

export interface FiltrosViajeForm {
  origen: string
  destino: string
  fecha: string
  servicioId: ServicioId | ''
}

/** Origen y destino con los que arranca la búsqueda. Nunca hay una opción "Todos". */
export const ORIGEN_PREDETERMINADO = 'Lima'
export const DESTINO_PREDETERMINADO = 'Cusco'

/** Franjas horarias de salida. Sin ninguna elegida no se filtra por horario. */
export type FranjaId = 'madrugada' | 'manana' | 'tarde' | 'noche'

export type OrdenViajes = 'hora-asc' | 'hora-desc' | 'disp-desc' | 'disp-asc' | 'precio-asc' | 'precio-desc'

/**
 * Preferencias de vista de la lista de viajes (franjas de horario y orden).
 * Viven en el wizard —no en el componente— para que volver desde "Asientos"
 * encuentre la lista exactamente como se dejó.
 */
export interface VistaViajes {
  /** Franjas activas. Vacío = todos los horarios (no existe una opción "Todos"). */
  franjas: FranjaId[]
  orden: OrdenViajes
}

export const vistaViajesInicial: VistaViajes = {
  franjas: [],
  orden: 'hora-asc',
}
