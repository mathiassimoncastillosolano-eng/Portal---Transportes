import { create } from 'zustand'
import { FECHA_REFERENCIA } from '@/config/referencia'
import type { ComprobanteOperacion } from '@/types/pasaje'
import type { ViajeListado } from '@/types/viaje'
import { validarPasajero } from '../utils/validaciones'
import {
  DESTINO_PREDETERMINADO,
  MAX_ASIENTOS,
  ORIGEN_PREDETERMINADO,
  pasajeroFormVacio,
  PASOS,
  type FiltrosViajeForm,
  type PagoForm,
  type PasajeroForm,
  vistaViajesInicial,
  type PasoId,
  type VistaViajes,
} from '../types'

const filtrosIniciales: FiltrosViajeForm = {
  origen: ORIGEN_PREDETERMINADO,
  destino: DESTINO_PREDETERMINADO,
  fecha: FECHA_REFERENCIA,
  servicioId: '',
}
const pagoInicial: PagoForm = { metodoPagoId: '', montoRecibido: '', referencia: '' }

/** Un asiento "tiene datos" cuando algún campo (salvo el tipo de documento, que trae valor por defecto) fue tocado. */
function tieneDatosForm(form: PasajeroForm | undefined): boolean {
  if (!form) return false
  return Object.entries(form).some(([campo, valor]) => campo !== 'tipoDocumento' && valor !== '')
}

interface WizardState {
  paso: PasoId
  filtros: FiltrosViajeForm
  /** Franjas de horario y orden de la lista de viajes. */
  vista: VistaViajes
  viaje: ViajeListado | null
  /** Asientos seleccionados, en el orden en que se eligieron (máx. `MAX_ASIENTOS`). */
  asientos: number[]
  /** Asiento cuyo formulario se muestra en el paso "Pasajeros". */
  asientoActivo: number | null
  /** Datos de pasajero por número de asiento. Independientes entre sí: cambiar de asiento activo nunca los mezcla. */
  pasajerosPorAsiento: Record<number, PasajeroForm>
  pago: PagoForm
  comprobante: ComprobanteOperacion | null

  setFiltros: (parcial: Partial<FiltrosViajeForm>) => void
  setVista: (parcial: Partial<VistaViajes>) => void
  /** Restablece filtros de búsqueda y de vista (no toca el viaje ya elegido). */
  restablecerFiltros: () => void
  seleccionarViaje: (viaje: ViajeListado) => void
  /** `true` si el asiento tiene datos de pasajero ingresados (para pedir confirmación antes de quitarlo). */
  tieneDatosAsiento: (numero: number) => boolean
  /** Agrega un asiento a la selección. No hace nada si ya está o si se alcanzó el máximo. */
  agregarAsiento: (numero: number) => void
  /** Quita un asiento de la selección y descarta los datos de su pasajero. */
  quitarAsiento: (numero: number) => void
  setAsientoActivo: (numero: number | null) => void
  setDatosPasajero: (numero: number, parcial: Partial<PasajeroForm>) => void
  setPago: (parcial: Partial<PagoForm>) => void
  irA: (paso: PasoId) => void
  confirmar: (comprobante: ComprobanteOperacion) => void
  reiniciar: () => void
}

/**
 * Estado del asistente "Registrar pasaje". Vive en memoria (sin `persist`) y
 * no usa rutas: los pasos son estado. Está en un store —y no en un
 * `useState` de la sección— para que cambiar a otra sección del menú no
 * descarte los datos ingresados.
 *
 * Soporta de 1 a `MAX_ASIENTOS` asientos por operación: cada asiento
 * seleccionado tiene su propio formulario de pasajero en
 * `pasajerosPorAsiento`, independiente del resto.
 */
export const useTicketWizardStore = create<WizardState>()((set, get) => ({
  paso: 'viaje',
  filtros: filtrosIniciales,
  vista: vistaViajesInicial,
  viaje: null,
  asientos: [],
  asientoActivo: null,
  pasajerosPorAsiento: {},
  pago: pagoInicial,
  comprobante: null,

  setFiltros: (parcial) => set({ filtros: { ...get().filtros, ...parcial } }),
  setVista: (parcial) => set({ vista: { ...get().vista, ...parcial } }),
  restablecerFiltros: () => set({ filtros: filtrosIniciales, vista: vistaViajesInicial }),

  seleccionarViaje: (viaje) => {
    const actual = get().viaje
    // Cambiar de viaje invalida los asientos y el monto ya calculado.
    if (actual?.id !== viaje.id) {
      set({ viaje, asientos: [], asientoActivo: null, pasajerosPorAsiento: {}, pago: pagoInicial })
    } else {
      set({ viaje })
    }
  },

  tieneDatosAsiento: (numero) => tieneDatosForm(get().pasajerosPorAsiento[numero]),

  agregarAsiento: (numero) => {
    const estado = get()
    if (estado.asientos.includes(numero) || estado.asientos.length >= MAX_ASIENTOS) return
    const asientos = [...estado.asientos, numero]
    set({
      asientos,
      asientoActivo: estado.asientoActivo ?? numero,
      pasajerosPorAsiento: { ...estado.pasajerosPorAsiento, [numero]: { ...pasajeroFormVacio } },
    })
  },

  quitarAsiento: (numero) => {
    const estado = get()
    const asientos = estado.asientos.filter((a) => a !== numero)
    const pasajerosPorAsiento = { ...estado.pasajerosPorAsiento }
    delete pasajerosPorAsiento[numero]
    const asientoActivo = estado.asientoActivo === numero ? (asientos[0] ?? null) : estado.asientoActivo
    set({ asientos, pasajerosPorAsiento, asientoActivo })
  },

  setAsientoActivo: (numero) => set({ asientoActivo: numero }),

  setDatosPasajero: (numero, parcial) => {
    const estado = get()
    const actual = estado.pasajerosPorAsiento[numero] ?? { ...pasajeroFormVacio }
    set({ pasajerosPorAsiento: { ...estado.pasajerosPorAsiento, [numero]: { ...actual, ...parcial } } })
  },

  setPago: (parcial) => set({ pago: { ...get().pago, ...parcial } }),
  irA: (paso) => set({ paso }),
  confirmar: (comprobante) => set({ comprobante, paso: 'confirmacion' }),
  reiniciar: () =>
    set({
      paso: 'viaje',
      filtros: filtrosIniciales,
      vista: vistaViajesInicial,
      viaje: null,
      asientos: [],
      asientoActivo: null,
      pasajerosPorAsiento: {},
      pago: pagoInicial,
      comprobante: null,
    }),
}))

/** Estado del asistente más valores derivados (total, progreso de pasajeros, si hay datos sin guardar). */
export function useTicketWizard() {
  const estado = useTicketWizardStore()
  const pasoIndex = PASOS.findIndex((p) => p.id === estado.paso)
  const cantidadPasajes = estado.asientos.length
  const total = (estado.viaje?.tarifa ?? 0) * cantidadPasajes

  const completos = estado.asientos.filter(
    (numero) => Object.keys(validarPasajero(estado.pasajerosPorAsiento[numero] ?? { ...pasajeroFormVacio })).length === 0,
  )
  const cantidadCompletados = completos.length
  const todosPasajerosCompletos = cantidadPasajes > 0 && cantidadCompletados === cantidadPasajes

  const tieneDatos =
    estado.paso !== 'confirmacion' &&
    (estado.viaje !== null ||
      estado.asientos.length > 0 ||
      Object.values(estado.pasajerosPorAsiento).some(tieneDatosForm) ||
      estado.pago.metodoPagoId !== '')

  return {
    ...estado,
    pasoIndex,
    total,
    cantidadPasajes,
    cantidadCompletados,
    todosPasajerosCompletos,
    esAsientoCompleto: (numero: number) => completos.includes(numero),
    tieneDatos,
  }
}
