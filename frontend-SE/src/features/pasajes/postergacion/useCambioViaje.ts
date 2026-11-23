import { useCallback, useEffect, useReducer, useRef } from 'react'
import { vistaViajesInicial, type AsientoElegido, type FiltrosViajeForm, type VistaViajes } from '@/features/ticketing/types'
import { consultaViajesService } from '@/services'
import { cambioViajeService, codigoDeError, mensajeDeError } from '@/services/api/cambioViajeService'
import type { ConfirmacionCambio, CotizacionCambio, IntentoPagoCambio, MetodoPagoAgencia, ResultadoPos } from '@/types/cambioViaje'
import type { ViajeHistorial } from '@/types/cliente'
import type { AsientoConsulta, SesionReserva, ViajeConsulta } from '@/types/consultaViaje'
import { fechaHoyLima } from '@/utils/fechas'
import {
  CODIGOS_ASIENTO_PERDIDO,
  CODIGOS_PASAJE_NO_CAMBIABLE,
  MINUTOS_RESERVA_CAMBIO,
  mensajeDeRechazo,
  nuevaClaveDeIntento,
  type Solicitante,
} from './reglas'

/*
 * Máquina de estados del modal "Cambiar viaje" (patrón State con useReducer).
 * Fases: validando → verificacion → viaje → asiento → tarifa → (procesando) → resultado
 * Cada acción del reductor cambia el estado de una sola forma; así el flujo se puede seguir paso a paso.
 */

export type Fase = 'validando' | 'verificacion' | 'viaje' | 'asiento' | 'tarifa' | 'procesando' | 'resultado'

export interface DatosPago {
  metodo: MetodoPagoAgencia
  resultado: ResultadoPos
  codigo: string
  recibido: string
  clave: string
}

export interface ResultadoCambio {
  exito: boolean
  mensaje?: string
  confirmacion?: ConfirmacionCambio
  metodo?: MetodoPagoAgencia | null
}

export interface EstadoCambio {
  fase: Fase
  solicitante: Solicitante | null
  verificados: string[]
  filtros: FiltrosViajeForm
  vista: VistaViajes
  viaje: ViajeConsulta | null
  asiento: AsientoElegido | null
  sesion: SesionReserva | null
  apartando: number | null
  cotizacion: CotizacionCambio | null
  acepta: boolean
  pago: DatosPago
  intentos: IntentoPagoCambio[]
  aviso: string | null
  resultado: ResultadoCambio | null
}

type Accion =
  | { tipo: 'elegible' }
  | { tipo: 'noCambiable'; mensaje: string }
  | { tipo: 'solicitante'; valor: Solicitante }
  | { tipo: 'verificar'; id: string; marcado: boolean }
  | { tipo: 'filtros'; parcial: Partial<FiltrosViajeForm> }
  | { tipo: 'vista'; parcial: Partial<VistaViajes> }
  | { tipo: 'restablecer'; filtros: FiltrosViajeForm }
  | { tipo: 'viaje'; viaje: ViajeConsulta }
  | { tipo: 'apartando'; idAsiento: number }
  | { tipo: 'asientoReservado'; asiento: AsientoElegido; sesion: SesionReserva }
  | { tipo: 'asientoLiberado' }
  | { tipo: 'reservaPerdida'; mensaje: string }
  | { tipo: 'cotizacion'; cotizacion: CotizacionCambio }
  | { tipo: 'ir'; fase: Fase }
  | { tipo: 'acepta'; valor: boolean }
  | { tipo: 'pago'; parcial: Partial<DatosPago> }
  | { tipo: 'intentos'; intentos: IntentoPagoCambio[] }
  | { tipo: 'aviso'; mensaje: string | null }
  | { tipo: 'procesando' }
  | { tipo: 'fallo'; mensaje: string }
  | { tipo: 'pagoRechazado'; mensaje: string }
  | { tipo: 'exito'; resultado: ResultadoCambio }

export function filtrosIniciales(pasaje: ViajeHistorial, hoy: string): FiltrosViajeForm {
  const fecha = pasaje.fechaSalida && pasaje.fechaSalida >= hoy ? pasaje.fechaSalida : hoy
  return { origen: pasaje.origen, destino: pasaje.destino, fecha }
}

function pagoInicial(): DatosPago {
  return { metodo: 'EFECTIVO', resultado: 'APROBADO', codigo: '', recibido: '', clave: nuevaClaveDeIntento() }
}

function iniciar(pasaje: ViajeHistorial): EstadoCambio {
  return {
    fase: 'validando',
    solicitante: null,
    verificados: [],
    filtros: filtrosIniciales(pasaje, fechaHoyLima()),
    vista: vistaViajesInicial,
    viaje: null,
    asiento: null,
    sesion: null,
    apartando: null,
    cotizacion: null,
    acepta: false,
    pago: pagoInicial(),
    intentos: [],
    aviso: null,
    resultado: null,
  }
}

// Al soltar el asiento también se olvida todo lo que dependía de él.
const SIN_ASIENTO = { asiento: null, sesion: null, apartando: null, cotizacion: null, acepta: false }

function reductor(estado: EstadoCambio, accion: Accion): EstadoCambio {
  switch (accion.tipo) {
    case 'elegible':
      return { ...estado, fase: 'verificacion' }
    case 'noCambiable':
      return { ...estado, ...SIN_ASIENTO, fase: 'resultado', resultado: { exito: false, mensaje: accion.mensaje } }
    case 'solicitante':
      return { ...estado, solicitante: accion.valor, verificados: [] }
    case 'verificar': {
      const otros = estado.verificados.filter((id) => id !== accion.id)
      return { ...estado, verificados: accion.marcado ? [...otros, accion.id] : otros }
    }
    case 'filtros':
      return { ...estado, filtros: { ...estado.filtros, ...accion.parcial } }
    case 'vista':
      return { ...estado, vista: { ...estado.vista, ...accion.parcial } }
    case 'restablecer':
      return { ...estado, filtros: accion.filtros, vista: vistaViajesInicial }
    case 'viaje':
      return estado.viaje?.id === accion.viaje.id ? estado : { ...estado, ...SIN_ASIENTO, viaje: accion.viaje, aviso: null }
    case 'apartando':
      return { ...estado, apartando: accion.idAsiento, aviso: null }
    case 'asientoReservado':
      return { ...estado, asiento: accion.asiento, sesion: accion.sesion, apartando: null, cotizacion: null, acepta: false }
    case 'asientoLiberado':
      return { ...estado, ...SIN_ASIENTO }
    case 'reservaPerdida':
      if (estado.fase === 'resultado') return estado
      return {
        ...estado,
        ...SIN_ASIENTO,
        fase: estado.fase === 'tarifa' || estado.fase === 'procesando' ? 'asiento' : estado.fase,
        aviso: accion.mensaje,
      }
    case 'cotizacion':
      return { ...estado, cotizacion: accion.cotizacion }
    case 'ir':
      return { ...estado, fase: accion.fase, aviso: null }
    case 'acepta':
      return { ...estado, acepta: accion.valor }
    case 'pago':
      return { ...estado, pago: { ...estado.pago, ...accion.parcial }, aviso: null }
    case 'intentos':
      return { ...estado, intentos: accion.intentos }
    case 'aviso':
      return { ...estado, aviso: accion.mensaje }
    case 'procesando':
      return { ...estado, fase: 'procesando', aviso: null }
    case 'fallo':
      return { ...estado, fase: 'tarifa', aviso: accion.mensaje }
    case 'pagoRechazado':
      // Cada reintento lleva una clave nueva; el código del intento anterior se limpia.
      return { ...estado, fase: 'tarifa', aviso: accion.mensaje, pago: { ...estado.pago, codigo: '', clave: nuevaClaveDeIntento() } }
    case 'exito':
      return { ...estado, fase: 'resultado', sesion: null, resultado: accion.resultado }
  }
}

function liberarReserva(idViaje: number, sesion: SesionReserva | null) {
  if (!sesion) return Promise.resolve()
  return consultaViajesService.liberarSesion(idViaje, sesion.tokenSesion).catch(() => undefined)
}

export function useCambioViaje(pasaje: ViajeHistorial) {
  const [estado, despachar] = useReducer(reductor, pasaje, iniciar)
  const estadoRef = useRef(estado)
  const enVuelo = useRef(false)
  const idPasaje = pasaje.idPasaje

  useEffect(() => {
    estadoRef.current = estado
  })

  // 1) Al abrir: ¿el pasaje se puede cambiar?
  useEffect(() => {
    let activo = true
    cambioViajeService.consultarElegibilidad(idPasaje).then(
      (respuesta) => {
        if (!activo) return
        despachar(
          respuesta.elegible
            ? { tipo: 'elegible' }
            : { tipo: 'noCambiable', mensaje: mensajeDeRechazo(respuesta.codigo, respuesta.motivo) },
        )
      },
      (error) => {
        if (activo) despachar({ tipo: 'noCambiable', mensaje: mensajeDeError(error, 'No se pudo verificar el pasaje.') })
      },
    )
    return () => {
      activo = false
    }
  }, [idPasaje])

  // Si el modal se cierra sin terminar, se suelta el asiento reservado.
  useEffect(() => {
    return () => {
      const { viaje, sesion, resultado } = estadoRef.current
      if (viaje && !resultado?.exito) void liberarReserva(viaje.id, sesion)
    }
  }, [])

  // La reserva temporal vence: el asiento vuelve a estar libre para otros.
  useEffect(() => {
    if (!estado.sesion) return
    const restante = Math.max(0, estado.sesion.expiraEn - Date.now())
    const temporizador = window.setTimeout(
      () => despachar({ tipo: 'reservaPerdida', mensaje: 'La reserva temporal del asiento venció. Elija el asiento otra vez.' }),
      restante,
    )
    return () => window.clearTimeout(temporizador)
  }, [estado.sesion])

  // Al llegar a un cobro, se muestran los intentos que ya tiene este pasaje.
  const requierePago = estado.cotizacion?.requierePago === true
  useEffect(() => {
    if (!requierePago) return
    let activo = true
    cambioViajeService.listarIntentos(idPasaje).then(
      (intentos) => activo && despachar({ tipo: 'intentos', intentos }),
      () => undefined,
    )
    return () => {
      activo = false
    }
  }, [requierePago, idPasaje])

  const elegirViaje = useCallback((viaje: ViajeConsulta) => {
    const actual = estadoRef.current
    if (actual.viaje && actual.viaje.id !== viaje.id) void liberarReserva(actual.viaje.id, actual.sesion)
    despachar({ tipo: 'viaje', viaje })
  }, [])

  const cotizar = useCallback(
    async (idViaje: number, idAsiento: number) => {
      try {
        const cotizacion = await cambioViajeService.cotizar(idPasaje, idViaje, idAsiento)
        if (estadoRef.current.asiento?.idAsiento === idAsiento) despachar({ tipo: 'cotizacion', cotizacion })
      } catch (error) {
        despachar({ tipo: 'aviso', mensaje: mensajeDeError(error, 'No se pudo calcular la tarifa. Elija el asiento otra vez.') })
      }
    },
    [idPasaje],
  )

  // Un cambio de viaje usa un solo asiento: al elegir otro, se suelta la reserva anterior.
  const alternarAsiento = useCallback(
    async (elegido: AsientoConsulta) => {
      const { viaje, asiento, sesion, apartando } = estadoRef.current
      if (!viaje || apartando !== null) return
      despachar({ tipo: 'apartando', idAsiento: elegido.idAsiento })
      await liberarReserva(viaje.id, sesion)

      if (asiento?.idAsiento === elegido.idAsiento) {
        despachar({ tipo: 'asientoLiberado' })
        return
      }

      let sesionNueva: SesionReserva | null = null
      try {
        sesionNueva = await consultaViajesService.crearSesion(viaje.id, MINUTOS_RESERVA_CAMBIO)
        await consultaViajesService.bloquearAsiento(viaje.id, elegido.idAsiento, sesionNueva.tokenSesion)
      } catch (error) {
        void liberarReserva(viaje.id, sesionNueva)
        despachar({ tipo: 'asientoLiberado' })
        despachar({ tipo: 'aviso', mensaje: mensajeDeError(error, 'No se pudo reservar el asiento. Elija otro.') })
        return
      }

      despachar({
        tipo: 'asientoReservado',
        sesion: sesionNueva,
        asiento: {
          idAsiento: elegido.idAsiento,
          numero: elegido.numero,
          piso: elegido.piso,
          precio: elegido.precio ?? viaje.precio ?? 0,
        },
      })
      void cotizar(viaje.id, elegido.idAsiento)
    },
    [cotizar],
  )

  // El mapa avisa en vivo si el asiento reservado quedó libre (por ejemplo, venció la reserva).
  const asientoLiberadoEnServidor = useCallback((idAsiento: number) => {
    if (estadoRef.current.asiento?.idAsiento === idAsiento && estadoRef.current.apartando === null) {
      despachar({ tipo: 'reservaPerdida', mensaje: 'El asiento elegido ya no está reservado. Elija el asiento otra vez.' })
    }
  }, [])

  const manejarError = useCallback((error: unknown) => {
    const codigo = codigoDeError(error)
    const mensaje = mensajeDeError(error, 'No se pudo completar el cambio. El pasaje no fue modificado.')
    if (codigo && CODIGOS_ASIENTO_PERDIDO.includes(codigo)) {
      despachar({ tipo: 'reservaPerdida', mensaje })
    } else if (codigo && CODIGOS_PASAJE_NO_CAMBIABLE.includes(codigo)) {
      despachar({ tipo: 'noCambiable', mensaje: mensajeDeRechazo(codigo, mensaje) })
    } else {
      despachar({ tipo: 'fallo', mensaje })
    }
  }, [])

  // Tarifa igual o menor: se confirma sin cobro.
  // Tarifa mayor: se registra el pago; si se aprueba, el backend aplica el cambio en la misma operación.
  const confirmar = useCallback(async () => {
    const { viaje, asiento, sesion, cotizacion, acepta, pago } = estadoRef.current
    if (!viaje || !asiento || !sesion || !cotizacion || enVuelo.current) return
    enVuelo.current = true
    despachar({ tipo: 'procesando' })
    try {
      if (!cotizacion.requierePago) {
        const confirmacion = await cambioViajeService.confirmarSinCobro(idPasaje, {
          idViajeNuevo: viaje.id,
          idAsiento: asiento.idAsiento,
          tokenSesion: sesion.tokenSesion,
          aceptaSinDevolucion: acepta,
        })
        despachar({ tipo: 'exito', resultado: { exito: true, confirmacion, metodo: null } })
        return
      }

      const esEfectivo = pago.metodo === 'EFECTIVO'
      const respuesta = await cambioViajeService.registrarPago(idPasaje, {
        idViajeNuevo: viaje.id,
        idAsiento: asiento.idAsiento,
        tokenSesion: sesion.tokenSesion,
        metodo: pago.metodo,
        resultado: esEfectivo ? null : pago.resultado,
        numeroOperacion: esEfectivo ? null : pago.codigo.trim(),
        claveIdempotencia: pago.clave,
      })
      const intentos = await cambioViajeService.listarIntentos(idPasaje).catch(() => estadoRef.current.intentos)
      despachar({ tipo: 'intentos', intentos })

      if (respuesta.cambioAplicado && respuesta.confirmacion) {
        despachar({ tipo: 'exito', resultado: { exito: true, confirmacion: respuesta.confirmacion, metodo: pago.metodo } })
      } else {
        despachar({ tipo: 'pagoRechazado', mensaje: respuesta.mensajeParaAgente })
      }
    } catch (error) {
      manejarError(error)
    } finally {
      enVuelo.current = false
    }
  }, [idPasaje, manejarError])

  const restablecer = useCallback(() => despachar({ tipo: 'restablecer', filtros: filtrosIniciales(pasaje, fechaHoyLima()) }), [pasaje])

  return {
    estado,
    acciones: {
      elegirSolicitante: useCallback((valor: Solicitante) => despachar({ tipo: 'solicitante', valor }), []),
      verificar: useCallback((id: string, marcado: boolean) => despachar({ tipo: 'verificar', id, marcado }), []),
      cambiarFiltros: useCallback((parcial: Partial<FiltrosViajeForm>) => despachar({ tipo: 'filtros', parcial }), []),
      cambiarVista: useCallback((parcial: Partial<VistaViajes>) => despachar({ tipo: 'vista', parcial }), []),
      restablecer,
      elegirViaje,
      alternarAsiento,
      asientoLiberadoEnServidor,
      ir: useCallback((fase: Fase) => despachar({ tipo: 'ir', fase }), []),
      aceptar: useCallback((valor: boolean) => despachar({ tipo: 'acepta', valor }), []),
      cambiarPago: useCallback((parcial: Partial<DatosPago>) => despachar({ tipo: 'pago', parcial }), []),
      confirmar,
    },
  }
}
