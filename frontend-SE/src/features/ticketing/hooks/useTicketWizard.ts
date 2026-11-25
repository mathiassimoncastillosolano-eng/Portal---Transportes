import { create } from 'zustand'
import { consultaViajesService } from '@/services'
import { esApiError } from '@/services/api/httpClient'
import { useToastStore } from '@/stores/toastStore'
import type { AsientoConsulta, SesionReserva, ViajeConsulta } from '@/types/consultaViaje'
import { fechaHoyLima } from '@/utils/fechas'
import { validarPasajero } from '../utils/validaciones'
import {
  MAX_ASIENTOS,
  MINUTOS_BLOQUEO,
  PASOS,
  pasajeroFormVacio,
  vistaViajesInicial,
  type AsientoElegido,
  type FiltrosViajeForm,
  type PasajeroForm,
  type PasoId,
  type VistaViajes,
} from '../types'

const filtrosIniciales = (): FiltrosViajeForm => ({ origen: '', destino: '', fecha: fechaHoyLima() })

const estadoInicial = () => ({
  paso: 'viaje' as PasoId,
  filtros: filtrosIniciales(),
  vista: vistaViajesInicial,
  viaje: null as ViajeConsulta | null,
  sesion: null as SesionReserva | null,
  asientos: [] as AsientoElegido[],
  procesando: null as number | null,
  asientoActivo: null as number | null,
  pasajerosPorAsiento: {} as Record<number, PasajeroForm>,
})

const mensajeDe = (e: unknown, defecto: string) => (esApiError(e) ? e.message : defecto)

function liberarEnServidor(idViaje: number, tokenSesion: string | undefined) {
  if (!tokenSesion) return
  void consultaViajesService.liberarSesion(idViaje, tokenSesion).catch(() => undefined)
}

interface WizardState extends ReturnType<typeof estadoInicial> {
  setFiltros: (parcial: Partial<FiltrosViajeForm>) => void
  setVista: (parcial: Partial<VistaViajes>) => void
  restablecerFiltros: () => void
  seleccionarViaje: (viaje: ViajeConsulta) => void
  alternarAsiento: (asiento: AsientoConsulta) => Promise<void>
  liberadoPorServidor: (idAsiento: number) => void
  vencerSesion: () => void
  setAsientoActivo: (idAsiento: number | null) => void
  setDatosPasajero: (idAsiento: number, parcial: Partial<PasajeroForm>) => void
  irA: (paso: PasoId) => void
  volverABuscar: () => void
  cancelarRegistro: () => void
}

export const useTicketWizardStore = create<WizardState>()((set, get) => {
  const notificar = useToastStore.getState().push

  function vaciarSeleccion() {
    set({ sesion: null, asientos: [], asientoActivo: null, pasajerosPorAsiento: {}, procesando: null })
  }

  return {
    ...estadoInicial(),

    setFiltros: (parcial) => set({ filtros: { ...get().filtros, ...parcial } }),
    setVista: (parcial) => set({ vista: { ...get().vista, ...parcial } }),
    restablecerFiltros: () => set({ filtros: filtrosIniciales(), vista: vistaViajesInicial }),

    seleccionarViaje: (viaje) => {
      const { viaje: actual, sesion } = get()
      if (actual && actual.id !== viaje.id) {
        liberarEnServidor(actual.id, sesion?.tokenSesion)
        vaciarSeleccion()
      }
      set({ viaje })
    },

    alternarAsiento: async (asiento) => {
      const inicio = get()
      const viaje = inicio.viaje
      if (!viaje || inicio.procesando !== null) return
      const elegido = inicio.asientos.find((a) => a.idAsiento === asiento.idAsiento)

      if (elegido) {
        set({ procesando: asiento.idAsiento })
        try {
          if (inicio.sesion) await consultaViajesService.liberarAsiento(viaje.id, asiento.idAsiento, inicio.sesion.tokenSesion)
        } catch (e) {
          set({ procesando: null })
          notificar({ tone: 'danger', title: 'No se pudo liberar el asiento', description: mensajeDe(e, 'Inténtalo de nuevo.') })
          return
        }
        const actual = get()
        const asientos = actual.asientos.filter((a) => a.idAsiento !== asiento.idAsiento)
        const pasajerosPorAsiento = { ...actual.pasajerosPorAsiento }
        delete pasajerosPorAsiento[asiento.idAsiento]
        if (asientos.length === 0) {
          liberarEnServidor(viaje.id, actual.sesion?.tokenSesion)
          vaciarSeleccion()
          return
        }
        set({
          asientos,
          pasajerosPorAsiento,
          procesando: null,
          asientoActivo: actual.asientoActivo === asiento.idAsiento ? asientos[0].idAsiento : actual.asientoActivo,
        })
        return
      }

      if (inicio.asientos.length >= MAX_ASIENTOS) {
        notificar({
          tone: 'info',
          title: 'Máximo de asientos alcanzado',
          description: `Solo puedes seleccionar ${MAX_ASIENTOS} asientos por registro.`,
        })
        return
      }

      set({ procesando: asiento.idAsiento })
      let sesion = inicio.sesion
      const sesionNueva = sesion === null
      try {
        if (!sesion) sesion = await consultaViajesService.crearSesion(viaje.id, MINUTOS_BLOQUEO)
        await consultaViajesService.bloquearAsiento(viaje.id, asiento.idAsiento, sesion.tokenSesion)
      } catch (e) {
        if (sesionNueva) liberarEnServidor(viaje.id, sesion?.tokenSesion)
        set({ procesando: null })
        notificar({
          tone: 'danger',
          title: 'No se pudo seleccionar el asiento',
          description: mensajeDe(e, 'Otra sesión pudo haberlo tomado. Elige otro asiento.'),
        })
        return
      }

      const actual = get()
      if (actual.viaje?.id !== viaje.id) {
        liberarEnServidor(viaje.id, sesion.tokenSesion)
        return
      }
      const nuevo: AsientoElegido = {
        idAsiento: asiento.idAsiento,
        numero: asiento.numero,
        piso: asiento.piso,
        precio: asiento.precio ?? viaje.precio ?? 0,
      }
      set({
        sesion: actual.sesion ?? sesion,
        asientos: [...actual.asientos, nuevo],
        asientoActivo: actual.asientoActivo ?? nuevo.idAsiento,
        pasajerosPorAsiento: { ...actual.pasajerosPorAsiento, [nuevo.idAsiento]: { ...pasajeroFormVacio } },
        procesando: null,
      })
    },

    liberadoPorServidor: (idAsiento) => {
      const actual = get()
      if (actual.procesando === idAsiento || !actual.asientos.some((a) => a.idAsiento === idAsiento)) return
      const asientos = actual.asientos.filter((a) => a.idAsiento !== idAsiento)
      const pasajerosPorAsiento = { ...actual.pasajerosPorAsiento }
      delete pasajerosPorAsiento[idAsiento]
      notificar({ tone: 'info', title: 'Un asiento seleccionado fue liberado', description: 'Su reserva temporal ya no está vigente.' })
      if (asientos.length === 0) {
        set({ sesion: null, asientos: [], asientoActivo: null, pasajerosPorAsiento: {}, paso: actual.paso === 'pasajeros' || actual.paso === 'pago' ? 'asientos' : actual.paso })
        return
      }
      set({
        asientos,
        pasajerosPorAsiento,
        asientoActivo: actual.asientoActivo === idAsiento ? asientos[0].idAsiento : actual.asientoActivo,
      })
    },

    vencerSesion: () => {
      const actual = get()
      if (!actual.sesion) return
      if (actual.viaje) liberarEnServidor(actual.viaje.id, actual.sesion.tokenSesion)
      set({
        sesion: null,
        asientos: [],
        asientoActivo: null,
        pasajerosPorAsiento: {},
        procesando: null,
        paso: actual.paso === 'pasajeros' || actual.paso === 'pago' ? 'asientos' : actual.paso,
      })
      notificar({
        tone: 'danger',
        title: 'Tu reserva temporal venció',
        description: 'Los asientos fueron liberados. Vuelve a seleccionarlos para continuar.',
      })
    },

    setAsientoActivo: (idAsiento) => set({ asientoActivo: idAsiento }),

    setDatosPasajero: (idAsiento, parcial) => {
      const actual = get()
      const previo = actual.pasajerosPorAsiento[idAsiento]
      if (!previo) return
      set({ pasajerosPorAsiento: { ...actual.pasajerosPorAsiento, [idAsiento]: { ...previo, ...parcial } } })
    },

    irA: (paso) => set({ paso }),

    volverABuscar: () => {
      const { viaje, sesion } = get()
      if (viaje) liberarEnServidor(viaje.id, sesion?.tokenSesion)
      vaciarSeleccion()
      set({ paso: 'viaje' })
    },

    cancelarRegistro: () => {
      const { viaje, sesion } = get()
      if (viaje) liberarEnServidor(viaje.id, sesion?.tokenSesion)
      set(estadoInicial())
    },
  }
})

function tieneDatosForm(form: PasajeroForm | undefined): boolean {
  if (!form) return false
  return form.dni !== '' || form.nombres !== '' || form.apellidos !== '' || form.fechaNacimiento !== '' || form.celular !== ''
}

export function useTicketWizard() {
  const estado = useTicketWizardStore()
  const pasoIndex = PASOS.findIndex((p) => p.id === estado.paso)
  const cantidadPasajes = estado.asientos.length
  const total = estado.asientos.reduce((suma, a) => suma + a.precio, 0)
  const completos = estado.asientos.filter(
    (a) => Object.keys(validarPasajero(estado.pasajerosPorAsiento[a.idAsiento] ?? { ...pasajeroFormVacio })).length === 0,
  )
  const tieneDatos =
    estado.viaje !== null || estado.asientos.length > 0 || Object.values(estado.pasajerosPorAsiento).some(tieneDatosForm)

  return {
    ...estado,
    pasoIndex,
    total,
    cantidadPasajes,
    cantidadCompletados: completos.length,
    esAsientoCompleto: (idAsiento: number) => completos.some((a) => a.idAsiento === idAsiento),
    tieneDatos,
  }
}
