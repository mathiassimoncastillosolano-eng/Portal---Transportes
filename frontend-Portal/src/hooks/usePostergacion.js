import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  CODIGO_ERROR_PROCESAMIENTO,
  ESTADOS_PAGO,
  aplicarTarifaDeEscenario,
  confirmarPostergacionSimulada,
  consultarElegibilidad,
  procesarPagoSimulado,
} from '../servicios/postergacionMock'
import { borrarSesionAsientos, guardarSesionAsientos } from '../servicios/viajesServicio'
import { confirmarPostergacionEnServidor } from '../servicios/postergacionServicio'
import { abrirCheckout, autenticar3ds } from '../servicios/culqiSdk'
import {
  ESTADOS_ACTIVOS,
  confirmar3ds,
  esperarResultadoPago,
  iniciarPagoCambio,
  nuevaClaveIdempotencia,
  obtenerConfiguracionPago,
} from '../servicios/pagosServicio'
import { construirSolicitudCambio } from '../utilidades/pagoCulqi'
import { adaptarRespuestaConfirmacion } from '../utilidades/confirmacionPostergacion'
import { CODIGOS_RECHAZO, puedeContinuarDesdeTarifa } from '../utilidades/postergacion'
import { evaluarCobro } from '../utilidades/cobroPostergacion'
import { VALORES_YAPE_INICIALES } from '../utilidades/pagoSimulado'
import { calcularTarifaDelAsiento } from '../utilidades/reprogramacionAsientos'
import { useReservaReprogramacion } from './useReservaReprogramacion'
import { limitarCampoPago } from '../utilidades/limitarCampoPago'

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
    datosPago: {
      tarjeta: { numero: '', titular: '', vencimiento: '', cvv: '' },
      yape: { ...VALORES_YAPE_INICIALES },
    },
    erroresPago: {},
    aceptaTerminosPago: false,
    configPago: null,
    pendiente: null,
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
      return { ...estado, metodo: accion.metodo, avisoPago: null, erroresPago: {} }
    case 'terminos-pago':
      return { ...estado, aceptaTerminosPago: accion.valor, avisoPago: null }
    case 'config-pago':
      return { ...estado, configPago: accion.config }
    case 'pendiente':
      return { ...estado, procesando: false, pendiente: accion.referencia, avisoPago: { tipo: 'pendiente', mensaje: accion.mensaje } }
    case 'editar-dato-pago':
      return {
        ...estado,
        datosPago: {
          ...estado.datosPago,
          [accion.metodo]: { ...estado.datosPago[accion.metodo], [accion.campo]: accion.valor },
        },
        erroresPago: { ...estado.erroresPago, [accion.campo]: undefined },
      }
    case 'errores-pago':
      return { ...estado, erroresPago: accion.errores, avisoPago: null }
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
      return { ...estado, fase: ORDEN_ATRAS[estado.fase] ?? estado.fase, avisoPago: null, aceptaCondiciones: false, aceptaTerminosPago: false }
    default:
      return estado
  }
}

export function usePostergacion({ pasaje, idCliente, escenario, alEscenarioConsumido, tema, correo }) {
  const [estado, despachar] = useReducer(reductor, undefined, estadoInicial)
  const enVuelo = useRef(false)
  const temaRef = useRef(tema)
  temaRef.current = tema
  const correoRef = useRef(correo)
  correoRef.current = correo
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
  const editarDatoPago = useCallback((metodo, campo, valor) => {
    const actuales = estadoRef.current.datosPago[metodo]
    despachar({ tipo: 'editar-dato-pago', metodo, campo, valor: limitarCampoPago(metodo, campo, valor, actuales) })
  }, [])
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
    const { viaje, asiento, comparacion, sesion } = estadoRef.current
    despachar({ tipo: 'confirmando' })
    try {
      // Pasaje real: el servidor aplica el cambio de una vez (criterios 8 a 11). Pasaje de prueba: sigue el mock.
      const respuesta = pasaje.deCompraReal
        ? await confirmarPostergacionEnServidor({ pasaje, viaje, asiento, comparacion, sesion, pago })
        : await confirmarPostergacionSimulada({
          pasaje, viaje, asiento, comparacion, idCliente, escenario: escenarioRef.current, pago,
        })
      despachar({
        tipo: 'exito',
        datos: {
          pasaje: respuesta.pasaje,
          pago: respuesta.pago,
          montoAdicional: respuesta.montoAdicional ?? comparacion.montoAPagar,
          comparacion,
        },
      })
    } catch (fallo) {
      manejarFallo(fallo)
    } finally {
      enVuelo.current = false
    }
  }, [pasaje, idCliente, manejarFallo])

  useEffect(() => {
    if (estado.fase !== FASES.PAGO || !pasaje.deCompraReal || estado.configPago) return undefined
    let cancelado = false
    obtenerConfiguracionPago()
      .then((config) => {
        if (!cancelado) despachar({ tipo: 'config-pago', config })
      })
      .catch(() => {
        if (!cancelado) {
          despachar({ tipo: 'aviso-pago', aviso: { tipo: 'error', mensaje: 'No pudimos cargar la configuración de pagos.' } })
        }
      })
    return () => { cancelado = true }
  }, [estado.fase, estado.configPago, pasaje.deCompraReal])

  const resolverPagoCambio = useCallback((respuesta, agotado) => {
    const { viaje, asiento, comparacion } = estadoRef.current
    if (respuesta?.estado === 'APROBADO' && respuesta.cambio) {
      const confirmado = adaptarRespuestaConfirmacion(respuesta.cambio, {
        pasaje, viaje, asiento, pago: { referencia: respuesta.referencia },
      })
      despachar({
        tipo: 'exito',
        datos: { pasaje: confirmado.pasaje, pago: confirmado.pago, montoAdicional: confirmado.montoAdicional, comparacion },
      })
    } else if (respuesta?.estado === 'APROBADO_SIN_ASIENTOS' || respuesta?.estado === 'REEMBOLSADO') {
      despachar({
        tipo: 'rechazar',
        datos: { codigo: 'CAMBIO_NO_APLICADO', mensaje: respuesta.mensaje, puedeReelegirAsiento: true },
      })
    } else if (agotado || ESTADOS_ACTIVOS.has(respuesta?.estado)) {
      despachar({
        tipo: 'pendiente',
        referencia: respuesta?.referencia ?? null,
        mensaje: 'Todavía no tenemos la confirmación de Culqi. No vuelvas a pagar: si el pago se aprueba, tu cambio se aplicará solo y lo verás en "Mis pasajes".',
      })
    } else {
      despachar({ tipo: 'aviso-pago', aviso: { tipo: 'rechazado', mensaje: respuesta?.mensaje ?? 'El pago no fue aprobado.' } })
    }
  }, [pasaje])

  const pagarConCulqi = useCallback(async () => {
    if (enVuelo.current) return
    const { configPago, aceptaTerminosPago, comparacion, viaje, asiento, sesion, pendiente } = estadoRef.current
    if (pendiente || !aceptaTerminosPago || !configPago?.disponible || !configPago?.publicKey || !sesion?.tokenSesion) return
    enVuelo.current = true
    let token
    try {
      token = await abrirCheckout({
        publicKey: configPago.publicKey,
        monto: comparacion.montoAPagar,
        titulo: 'RutaLibre',
        contenedor: '#culqi-contenedor',
        tema: temaRef.current,
      })
    } catch (error) {
      enVuelo.current = false
      if (!error.cancelado) despachar({ tipo: 'aviso-pago', aviso: { tipo: 'error', mensaje: error.message } })
      return
    }
    despachar({ tipo: 'iniciar-pago' })
    try {
      const correoPagador = correoRef.current
      let respuesta = await iniciarPagoCambio(pasaje.idPasaje, construirSolicitudCambio({
        idViajeNuevo: viaje.id,
        idAsiento: asiento.idAsiento,
        tokenSesion: sesion.tokenSesion,
        claveIdempotencia: nuevaClaveIdempotencia(),
        token,
        correo: correoPagador,
      }))
      if (respuesta.sesion?.tokenSesion) {
        despachar({ tipo: 'guardar-sesion', sesion: guardarSesionAsientos(viaje.id, respuesta.sesion) })
      }
      if (respuesta.estado === 'ACCION_REQUERIDA' && respuesta.requiere3ds) {
        const parametros = await autenticar3ds({
          publicKey: configPago.publicKey,
          tokenId: token.id,
          monto: comparacion.montoAPagar,
          correo: token.email || correoPagador,
        })
        respuesta = await confirmar3ds(respuesta.referencia, { token: token.id, parametros })
      }
      let agotado = false
      if (ESTADOS_ACTIVOS.has(respuesta.estado)) {
        const espera = await esperarResultadoPago(respuesta.referencia, { maxEsperaMs: 120000 })
        respuesta = espera.respuesta ?? respuesta
        agotado = espera.agotado
      }
      resolverPagoCambio(respuesta, agotado)
    } catch (error) {
      despachar({ tipo: 'aviso-pago', aviso: { tipo: 'error', mensaje: error.message || 'No pudimos procesar el pago. Inténtalo de nuevo.' } })
    } finally {
      enVuelo.current = false
    }
  }, [pasaje, resolverPagoCambio])

  const cambiarTerminosPago = useCallback((valor) => despachar({ tipo: 'terminos-pago', valor }), [])

  const pagar = useCallback(async () => {
    if (pasaje.deCompraReal) {
      await pagarConCulqi()
      return
    }
    if (enVuelo.current) return
    const { intentos: previos, metodo: elegido, datosPago } = estadoRef.current
    const cobro = evaluarCobro({ intentos: previos, metodo: elegido, datos: datosPago })
    if (!cobro.permitido) {
      if (cobro.motivo) {
        despachar({ tipo: 'aviso-pago', aviso: { tipo: 'pendiente', mensaje: cobro.motivo } })
      } else {
        despachar({ tipo: 'errores-pago', errores: cobro.errores })
      }
      return
    }
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
  }, [pasaje.deCompraReal, pagarConCulqi, confirmar, manejarFallo])

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
      cambiarTerminosPago,
      editarDatoPago,
      pagar,
      volver,
      reelegirAsiento,
    },
  }
}
