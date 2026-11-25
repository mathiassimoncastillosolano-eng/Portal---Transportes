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
  intentosDelCambioActual,
  mensajeDeRechazo,
  nuevaClaveDeIntento,
  type Solicitante,
} from './reglas'

/*
 * Máquina de estados del modal "Cambiar viaje" (patrón State con useReducer).
 * Fases: validando → verificacion → viaje → asiento → tarifa → (procesando) → resultado
 *
 * Reserva del asiento (igual que en el Portal):
 *  - Al entrar al mapa se abre UNA sesión de 10 minutos para ese viaje (arranca el contador).
 *  - Elegir un asiento lo bloquea con esa sesión; soltarlo lo libera al instante.
 *  - Elegir otro asiento: primero se libera el anterior y luego se bloquea el nuevo.
 *  - Si la sesión vence, se libera todo y se abre una sesión nueva (contador desde 10 min).
 *  - Al cambiar de viaje, cerrar el modal o cerrar la pestaña, se libera la sesión.
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
  sesion: SesionReserva | null
  asiento: AsientoElegido | null
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
  | { tipo: 'reservaIniciada'; sesion: SesionReserva }
  | { tipo: 'apartando'; idAsiento: number }
  | { tipo: 'asientoReservado'; asiento: AsientoElegido }
  | { tipo: 'asientoSoltado' }
  | { tipo: 'reservaPerdida'; mensaje: string; cerrarSesion: boolean }
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

// La búsqueda arranca en la misma ruta y en la fecha de HOY: se puede elegir cualquier viaje desde ahora,
// antes o después del viaje original (igual que en el Portal). El viaje original no aparece en la lista.
export function filtrosIniciales(pasaje: ViajeHistorial, hoy: string): FiltrosViajeForm {
  return { origen: pasaje.origen, destino: pasaje.destino, fecha: hoy }
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
    sesion: null,
    asiento: null,
    apartando: null,
    cotizacion: null,
    acepta: false,
    pago: pagoInicial(),
    intentos: [],
    aviso: null,
    resultado: null,
  }
}

// Al soltar el asiento también se olvida todo lo que dependía de él (la sesión sigue abierta).
const SIN_ASIENTO = { asiento: null, apartando: null, cotizacion: null, acepta: false }

function reductor(estado: EstadoCambio, accion: Accion): EstadoCambio {
  switch (accion.tipo) {
    case 'elegible':
      return { ...estado, fase: 'verificacion' }
    case 'noCambiable':
      return { ...estado, ...SIN_ASIENTO, sesion: null, fase: 'resultado', resultado: { exito: false, mensaje: accion.mensaje } }
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
      return estado.viaje?.id === accion.viaje.id ? estado : { ...estado, ...SIN_ASIENTO, sesion: null, viaje: accion.viaje, aviso: null }
    case 'reservaIniciada':
      return { ...estado, sesion: accion.sesion }
    case 'apartando':
      return { ...estado, apartando: accion.idAsiento, aviso: null }
    case 'asientoReservado':
      return { ...estado, asiento: accion.asiento, apartando: null, cotizacion: null, acepta: false }
    case 'asientoSoltado':
      return { ...estado, ...SIN_ASIENTO }
    case 'reservaPerdida':
      if (estado.fase === 'resultado') return estado
      return {
        ...estado,
        ...SIN_ASIENTO,
        sesion: accion.cerrarSesion ? null : estado.sesion,
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
      return { ...estado, intentos: intentosDelCambioActual(accion.intentos) }
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

export function useCambioViaje(pasaje: ViajeHistorial) {
  const [estado, despachar] = useReducer(reductor, pasaje, iniciar)
  const estadoRef = useRef(estado)
  const enVuelo = useRef(false)
  const abriendoSesion = useRef(false)
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

  // 2) Al entrar al mapa se abre la sesión de reserva (arranca el contador de 10 minutos).
  const enMapa = estado.fase === 'asiento' || estado.fase === 'tarifa'
  const idViajeElegido = estado.viaje?.id ?? null
  useEffect(() => {
    if (!enMapa || idViajeElegido === null || estado.sesion || abriendoSesion.current) return
    abriendoSesion.current = true
    consultaViajesService
      .crearSesion(idViajeElegido, MINUTOS_RESERVA_CAMBIO)
      .then((sesion) => {
        // Si mientras tanto se eligió otro viaje o se terminó, esta sesión ya no sirve.
        const actual = estadoRef.current
        if (actual.viaje?.id === idViajeElegido && !actual.resultado) despachar({ tipo: 'reservaIniciada', sesion })
        else void cambioViajeService.liberarReserva(idViajeElegido, sesion.tokenSesion)
      })
      .catch((error) => despachar({ tipo: 'aviso', mensaje: mensajeDeError(error, 'No se pudo iniciar la reserva de asientos.') }))
      .finally(() => {
        abriendoSesion.current = false
      })
  }, [enMapa, idViajeElegido, estado.sesion])

  // 3) La sesión vence: se libera todo y el efecto 2 abre una nueva (contador otra vez en 10 minutos).
  const sesionActual = estado.sesion
  useEffect(() => {
    if (!sesionActual) return
    const temporizador = window.setTimeout(() => {
      const viaje = estadoRef.current.viaje
      if (viaje) void cambioViajeService.liberarReserva(viaje.id, sesionActual.tokenSesion)
      despachar({ tipo: 'reservaPerdida', mensaje: 'La reserva de 10 minutos venció. Elija el asiento de nuevo.', cerrarSesion: true })
    }, Math.max(0, sesionActual.expiraEn - Date.now()))
    return () => window.clearTimeout(temporizador)
  }, [sesionActual])

  // 4) Si se cierra el modal o la pestaña sin terminar, se suelta la reserva para que otros puedan elegir.
  useEffect(() => {
    function soltarAlSalir() {
      const { viaje, sesion, resultado } = estadoRef.current
      if (viaje && sesion && !resultado?.exito) void cambioViajeService.liberarReserva(viaje.id, sesion.tokenSesion)
    }
    window.addEventListener('pagehide', soltarAlSalir)
    return () => {
      window.removeEventListener('pagehide', soltarAlSalir)
      soltarAlSalir()
    }
  }, [])

  // Al llegar a un cobro, se muestran los intentos que ya tiene este cambio.
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
    if (actual.viaje && actual.viaje.id !== viaje.id && actual.sesion) {
      void cambioViajeService.liberarReserva(actual.viaje.id, actual.sesion.tokenSesion)
    }
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

  // Un cambio de viaje usa un solo asiento.
  const alternarAsiento = useCallback(
    async (elegido: AsientoConsulta) => {
      const { viaje, asiento, sesion, apartando } = estadoRef.current
      if (!viaje || !sesion || apartando !== null) return

      // Clic en el mismo asiento: se suelta al instante para que otros lo puedan tomar.
      if (asiento?.idAsiento === elegido.idAsiento) {
        despachar({ tipo: 'asientoSoltado' })
        consultaViajesService
          .liberarAsiento(viaje.id, elegido.idAsiento, sesion.tokenSesion)
          .catch(() => undefined) // si ya había vencido, el backend ya lo liberó
        return
      }

      despachar({ tipo: 'apartando', idAsiento: elegido.idAsiento })
      // Primero se libera el asiento anterior y luego se bloquea el nuevo.
      if (asiento) {
        await consultaViajesService.liberarAsiento(viaje.id, asiento.idAsiento, sesion.tokenSesion).catch(() => undefined)
      }
      try {
        await consultaViajesService.bloquearAsiento(viaje.id, elegido.idAsiento, sesion.tokenSesion)
      } catch (error) {
        despachar({ tipo: 'asientoSoltado' })
        despachar({ tipo: 'aviso', mensaje: mensajeDeError(error, 'Ese asiento ya fue tomado. Elija otro.') })
        return
      }

      despachar({
        tipo: 'asientoReservado',
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

  // El mapa avisa en vivo si el asiento reservado quedó libre por otra razón (por ejemplo, venció).
  const asientoLiberadoEnServidor = useCallback((idAsiento: number) => {
    const actual = estadoRef.current
    if (actual.asiento?.idAsiento === idAsiento && actual.apartando === null) {
      despachar({ tipo: 'reservaPerdida', mensaje: 'El asiento elegido ya no está reservado. Elíjalo otra vez.', cerrarSesion: false })
    }
  }, [])

  const manejarError = useCallback((error: unknown) => {
    const codigo = codigoDeError(error)
    const mensaje = mensajeDeError(error, 'No se pudo completar el cambio. El pasaje no fue modificado.')
    if (codigo && CODIGOS_ASIENTO_PERDIDO.includes(codigo)) {
      // Sesión vencida: se abre otra. Asiento tomado: la sesión sigue sirviendo.
      despachar({ tipo: 'reservaPerdida', mensaje, cerrarSesion: codigo === 'SESION_VENCIDA' })
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
