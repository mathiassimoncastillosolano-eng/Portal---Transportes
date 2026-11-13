import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  CODIGO_ERROR_PROCESAMIENTO,
  ESTADOS_PAGO,
  aplicarTarifaDeEscenario,
  confirmarPostergacionSimulada,
  consultarElegibilidad,
  procesarPagoSimulado,
} from '../servicios/postergacionMock'
import { borrarSesionAsientos } from '../servicios/viajesServicio'
import { CODIGOS_RECHAZO, puedeContinuarDesdeTarifa } from '../utilidades/postergacion'
import { calcularTarifaDelAsiento } from '../utilidades/reprogramacionAsientos'
import { useReservaReprogramacion } from './useReservaReprogramacion'

export const FASES = Object.freeze({
  VALIDANDO: 'validando',
  VIAJE: 'viaje',
  ASIENTO: 'asiento',
  TARIFA: 'tarifa',
  PAGO: 'pago',
  CONFIRMANDO: 'confirmando',
  RESULTADO: 'resultado',
})

const ORDEN_ATRAS = {
  [FASES.ASIENTO]: FASES.VIAJE,
  [FASES.TARIFA]: FASES.ASIENTO,
  [FASES.PAGO]: FASES.TARIFA,
}

function estadoInicial() {
  return {
    fase: FASES.VALIDANDO,
    viaje: null,
    asiento: null,
    comparacion: null,
    aceptaCondiciones: false,
    metodo: 'tarjeta',
    procesando: false,
    busqueda: null,
    intentos: [],
    avisoPago: null,
    versionMapa: 0,
    resultado: null,
    // Reserva del asiento: sesión del backend (con su hora de expiración) y aviso si venció.
    sesion: null,
    sesionVencida: false,
  }
}

function reductor(estado, accion) {
  switch (accion.tipo) {
    case 'reiniciar':
      return estadoInicial()
    case 'elegibilidad-ok':
      return { ...estado, fase: FASES.VIAJE }
    case 'rechazar':
      return { ...estado, fase: FASES.RESULTADO, procesando: false, resultado: { exito: false, ...accion.datos } }
    case 'guardar-busqueda':
      return { ...estado, busqueda: accion.busqueda }
    case 'elegir-viaje':
      return { ...estado, viaje: accion.viaje, asiento: null, comparacion: null, aceptaCondiciones: false, avisoPago: null, sesion: null, sesionVencida: false, fase: FASES.ASIENTO }
    case 'elegir-asiento':
      return { ...estado, asiento: accion.asiento }
    case 'guardar-sesion':
      return { ...estado, sesion: accion.sesion }
    case 'reserva-liberada':
      return { ...estado, asiento: null, sesion: null }
    case 'sesion-vencida':
      // Se acabó el tiempo: el pasajero vuelve a elegir viaje (el pasaje original sigue igual).
      return { ...estado, fase: FASES.VIAJE, viaje: null, asiento: null, sesion: null, comparacion: null, aceptaCondiciones: false, avisoPago: null, procesando: false, sesionVencida: true }
    case 'ir-a-tarifa':
      return { ...estado, comparacion: accion.comparacion, aceptaCondiciones: false, fase: FASES.TARIFA }
    case 'aceptar':
      return { ...estado, aceptaCondiciones: accion.valor }
    case 'ir-a-pago':
      return { ...estado, fase: FASES.PAGO, avisoPago: null }
    case 'metodo':
      return { ...estado, metodo: accion.metodo, avisoPago: null }
    case 'iniciar-pago':
      return { ...estado, procesando: true, avisoPago: null }
    case 'confirmando':
      return { ...estado, fase: FASES.CONFIRMANDO, procesando: true, avisoPago: null }
    case 'intento':
      return { ...estado, intentos: [...estado.intentos, accion.intento] }
    case 'aviso-pago': {
      const fase = estado.fase === FASES.CONFIRMANDO
        ? (estado.comparacion?.requierePago ? FASES.PAGO : FASES.TARIFA)
        : estado.fase
      return { ...estado, fase, procesando: false, avisoPago: accion.aviso }
    }
    case 'exito':
      return { ...estado, fase: FASES.RESULTADO, procesando: false, resultado: { exito: true, ...accion.datos } }
    case 'reelegir-asiento':
      return { ...estado, fase: FASES.ASIENTO, asiento: null, comparacion: null, aceptaCondiciones: false, procesando: false, resultado: null, versionMapa: estado.versionMapa + 1 }
    case 'volver':
      return { ...estado, fase: ORDEN_ATRAS[estado.fase] ?? estado.fase, avisoPago: null, aceptaCondiciones: false }
    default:
      return estado
  }
}

export function usePostergacion({ pasaje, idCliente, escenario, alEscenarioConsumido }) {
  const [estado, despachar] = useReducer(reductor, undefined, estadoInicial)
  const enVuelo = useRef(false)
  const escenarioRef = useRef(escenario)
  escenarioRef.current = escenario
  const estadoRef = useRef(estado)
  estadoRef.current = estado

  // Si se acaba el tiempo (o el backend dice que la sesión ya no existe), se vuelve a elegir viaje.
  const vencerSesion = useCallback(() => {
    const idViaje = estadoRef.current.viaje?.id
    if (idViaje) borrarSesionAsientos(idViaje)
    despachar({ tipo: 'sesion-vencida' })
  }, [])

  // Temporizador: corre mientras se elige, se pausa durante el pago y se detiene al terminar el cambio.
  const { liberarReserva } = useReservaReprogramacion({
    idViaje: estado.viaje?.id,
    sesion: estado.sesion,
    idAsiento: estado.asiento?.idAsiento,
    pausada: estado.procesando || estado.fase === FASES.RESULTADO,
    finalizada: estado.resultado?.exito === true,
    alVencer: vencerSesion,
  })

  useEffect(() => {
    let cancelado = false
    enVuelo.current = false
    despachar({ tipo: 'reiniciar' })
    consultarElegibilidad(pasaje, idCliente).then((resultado) => {
      if (cancelado) return
      if (resultado.elegible) despachar({ tipo: 'elegibilidad-ok' })
      else despachar({ tipo: 'rechazar', datos: { codigo: resultado.codigo, mensaje: resultado.mensaje, motivoInicial: true } })
    })
    return () => { cancelado = true }
  }, [pasaje.idPasaje, pasaje.idCliente, idCliente])

  const guardarBusqueda = useCallback((busqueda) => despachar({ tipo: 'guardar-busqueda', busqueda }), [])

  const elegirViaje = useCallback((viaje) => {
    despachar({ tipo: 'elegir-viaje', viaje: aplicarTarifaDeEscenario(viaje, pasaje, escenarioRef.current) })
  }, [pasaje])

  // El asiento (o null) lo decide el mapa real: aquí solo se guarda.
  const elegirAsiento = useCallback((asiento) => despachar({ tipo: 'elegir-asiento', asiento }), [])

  const guardarSesion = useCallback((sesion) => despachar({ tipo: 'guardar-sesion', sesion }), [])

  const continuarDesdeAsiento = useCallback(() => {
    const { viaje, asiento } = estadoRef.current
    if (!viaje || !asiento) return
    // La tarifa se compara con el precio del asiento elegido, no con el precio "desde" del viaje.
    despachar({ tipo: 'ir-a-tarifa', comparacion: calcularTarifaDelAsiento(pasaje, asiento) })
  }, [pasaje])

  const aceptarCondiciones = useCallback((valor) => despachar({ tipo: 'aceptar', valor }), [])
  const cambiarMetodo = useCallback((metodo) => despachar({ tipo: 'metodo', metodo }), [])
  const volver = useCallback(() => {
    // Volver de elegir asiento a elegir viaje: se suelta el asiento y se cierra la sesión.
    if (estadoRef.current.fase === FASES.ASIENTO) {
      liberarReserva()
      despachar({ tipo: 'reserva-liberada' })
    }
    despachar({ tipo: 'volver' })
  }, [liberarReserva])
  const reelegirAsiento = useCallback(() => despachar({ tipo: 'reelegir-asiento' }), [])

  const manejarFallo = useCallback((fallo) => {
    if (fallo?.codigo === CODIGOS_RECHAZO.ASIENTO_NO_DISPONIBLE) {
      alEscenarioConsumido?.()
      despachar({ tipo: 'rechazar', datos: { codigo: fallo.codigo, mensaje: fallo.message, puedeReelegirAsiento: true } })
      return
    }
    if (fallo?.codigo === CODIGO_ERROR_PROCESAMIENTO) {
      despachar({ tipo: 'aviso-pago', aviso: { tipo: 'error', mensaje: fallo.message } })
      return
    }
    despachar({ tipo: 'rechazar', datos: { codigo: fallo?.codigo ?? 'DESCONOCIDO', mensaje: fallo?.message } })
  }, [alEscenarioConsumido])

  const confirmar = useCallback(async (pago = null) => {
    const { viaje, asiento, comparacion } = estadoRef.current
    despachar({ tipo: 'confirmando' })
    try {
      const respuesta = await confirmarPostergacionSimulada({
        pasaje, viaje, asiento, comparacion, idCliente, escenario: escenarioRef.current, pago,
      })
      despachar({
        tipo: 'exito',
        datos: { pasaje: respuesta.pasaje, pago: respuesta.pago, montoAdicional: comparacion.montoAPagar, comparacion },
      })
    } catch (fallo) {
      manejarFallo(fallo)
    } finally {
      enVuelo.current = false
    }
  }, [pasaje, idCliente, manejarFallo])

  const pagar = useCallback(async () => {
    if (enVuelo.current) return
    enVuelo.current = true
    const { viaje, asiento, comparacion, metodo, intentos } = estadoRef.current
    despachar({ tipo: 'iniciar-pago' })
    const numero = intentos.length + 1
    try {
      const pago = await procesarPagoSimulado({
        viaje, asiento, monto: comparacion.montoAPagar, metodo, escenario: escenarioRef.current,
      })
      despachar({
        tipo: 'intento',
        intento: { numero, metodo, resultado: pago.estado, referencia: pago.referencia, monto: pago.monto, mensaje: pago.mensaje, hora: Date.now() },
      })
      if (pago.estado === ESTADOS_PAGO.APROBADO) {
        await confirmar(pago)
        return
      }
      despachar({
        tipo: 'aviso-pago',
        aviso: { tipo: pago.estado === ESTADOS_PAGO.PENDIENTE ? 'pendiente' : 'rechazado', mensaje: pago.mensaje },
      })
    } catch (fallo) {
      despachar({
        tipo: 'intento',
        intento: { numero, metodo, resultado: fallo?.codigo ?? 'ERROR', referencia: null, monto: comparacion.montoAPagar, mensaje: fallo?.message, hora: Date.now() },
      })
      manejarFallo(fallo)
    } finally {
      enVuelo.current = false
    }
  }, [confirmar, manejarFallo])

  const continuarDesdeTarifa = useCallback(() => {
    const { comparacion, aceptaCondiciones } = estadoRef.current
    if (enVuelo.current || !puedeContinuarDesdeTarifa(comparacion, aceptaCondiciones)) return
    if (comparacion.requierePago) {
      despachar({ tipo: 'ir-a-pago' })
      return
    }
    enVuelo.current = true
    confirmar(null)
  }, [confirmar])

  return {
    estado,
    acciones: {
      guardarBusqueda,
      elegirViaje,
      elegirAsiento,
      guardarSesion,
      vencerSesion,
      continuarDesdeAsiento,
      aceptarCondiciones,
      continuarDesdeTarifa,
      cambiarMetodo,
      pagar,
      volver,
      reelegirAsiento,
    },
  }
}
