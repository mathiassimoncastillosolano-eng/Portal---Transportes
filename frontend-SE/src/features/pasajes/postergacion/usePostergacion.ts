import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { vistaViajesInicial, type AsientoElegido, type FiltrosViajeForm, type VistaViajes } from '@/features/ticketing/types'
import type { ViajeHistorial } from '@/types/cliente'
import type { ViajeConsulta } from '@/types/consultaViaje'
import { fechaHoyLima } from '@/utils/fechas'
import { confirmarPostergacionMock, consultarElegibilidadMock, registrarPagoMock } from './datosMock'
import { compararTarifas, type ComparacionTarifa, type MetodoCambio, type ResultadoTerminal } from './reglas'

export type Fase = 'validando' | 'viaje' | 'asiento' | 'tarifa' | 'procesando' | 'resultado'

export interface IntentoPago {
  numero: number
  metodo: MetodoCambio
  resultado: ResultadoTerminal
  monto: number
  hora: string
  referencia: string | null
}

export interface ResultadoPostergacion {
  exito: boolean
  mensaje?: string
  viaje?: ViajeConsulta
  asiento?: AsientoElegido
  comparacion?: ComparacionTarifa
  metodo?: MetodoCambio | null
  referencia?: string | null
}

export interface EstadoPostergacion {
  fase: Fase
  filtros: FiltrosViajeForm
  vista: VistaViajes
  viaje: ViajeConsulta | null
  asiento: AsientoElegido | null
  acepta: boolean
  metodo: MetodoCambio
  terminal: ResultadoTerminal
  intentos: IntentoPago[]
  aviso: string | null
  resultado: ResultadoPostergacion | null
}

type Accion =
  | { tipo: 'elegible' }
  | { tipo: 'rechazo'; mensaje: string }
  | { tipo: 'filtros'; parcial: Partial<FiltrosViajeForm> }
  | { tipo: 'vista'; parcial: Partial<VistaViajes> }
  | { tipo: 'restablecer'; filtros: FiltrosViajeForm }
  | { tipo: 'viaje'; viaje: ViajeConsulta }
  | { tipo: 'asiento'; asiento: AsientoElegido | null }
  | { tipo: 'ir'; fase: Fase }
  | { tipo: 'acepta'; valor: boolean }
  | { tipo: 'metodo'; metodo: MetodoCambio }
  | { tipo: 'terminal'; terminal: ResultadoTerminal }
  | { tipo: 'procesando' }
  | { tipo: 'intento'; intento: IntentoPago; aviso: string | null }
  | { tipo: 'fallo' }
  | { tipo: 'exito'; resultado: ResultadoPostergacion }

export function filtrosIniciales(pasaje: ViajeHistorial, hoy: string): FiltrosViajeForm {
  const fecha = pasaje.fechaSalida && pasaje.fechaSalida >= hoy ? pasaje.fechaSalida : hoy
  return { origen: pasaje.origen, destino: pasaje.destino, fecha }
}

function iniciar(pasaje: ViajeHistorial): EstadoPostergacion {
  return {
    fase: 'validando',
    filtros: filtrosIniciales(pasaje, fechaHoyLima()),
    vista: vistaViajesInicial,
    viaje: null,
    asiento: null,
    acepta: false,
    metodo: 'EFECTIVO',
    terminal: 'APROBADO',
    intentos: [],
    aviso: null,
    resultado: null,
  }
}

function reductor(estado: EstadoPostergacion, accion: Accion): EstadoPostergacion {
  switch (accion.tipo) {
    case 'elegible':
      return { ...estado, fase: 'viaje' }
    case 'rechazo':
      return { ...estado, fase: 'resultado', resultado: { exito: false, mensaje: accion.mensaje } }
    case 'filtros':
      return { ...estado, filtros: { ...estado.filtros, ...accion.parcial } }
    case 'vista':
      return { ...estado, vista: { ...estado.vista, ...accion.parcial } }
    case 'restablecer':
      return { ...estado, filtros: accion.filtros, vista: vistaViajesInicial }
    case 'viaje':
      return estado.viaje?.id === accion.viaje.id
        ? estado
        : { ...estado, viaje: accion.viaje, asiento: null, acepta: false, aviso: null }
    case 'asiento':
      return { ...estado, asiento: accion.asiento, acepta: false, aviso: null }
    case 'ir':
      return { ...estado, fase: accion.fase, aviso: null }
    case 'acepta':
      return { ...estado, acepta: accion.valor }
    case 'metodo':
      return { ...estado, metodo: accion.metodo, aviso: null }
    case 'terminal':
      return { ...estado, terminal: accion.terminal, aviso: null }
    case 'procesando':
      return { ...estado, fase: 'procesando', aviso: null }
    case 'intento':
      return { ...estado, intentos: [...estado.intentos, accion.intento], aviso: accion.aviso, fase: accion.aviso ? 'tarifa' : estado.fase }
    case 'fallo':
      return { ...estado, fase: 'tarifa', aviso: 'No pudimos completar la postergación. El pasaje conserva su viaje, asiento y estado originales.' }
    case 'exito':
      return { ...estado, fase: 'resultado', resultado: accion.resultado }
  }
}

export function usePostergacion(pasaje: ViajeHistorial) {
  const [estado, despachar] = useReducer(reductor, pasaje, iniciar)
  const estadoRef = useRef(estado)
  const enVuelo = useRef(false)

  useEffect(() => {
    estadoRef.current = estado
  })

  useEffect(() => {
    let activo = true
    void consultarElegibilidadMock(pasaje).then((resultado) => {
      if (!activo) return
      despachar(resultado.elegible ? { tipo: 'elegible' } : { tipo: 'rechazo', mensaje: resultado.mensaje })
    })
    return () => {
      activo = false
    }
  }, [pasaje])

  const comparacion = useMemo(
    () => (estado.asiento ? compararTarifas(pasaje.precio ?? 0, estado.asiento.precio) : null),
    [estado.asiento, pasaje.precio],
  )

  const elegirViaje = useCallback((viaje: ViajeConsulta) => despachar({ tipo: 'viaje', viaje }), [])
  const elegirAsiento = useCallback((asiento: AsientoElegido | null) => despachar({ tipo: 'asiento', asiento }), [])
  const ir = useCallback((fase: Fase) => despachar({ tipo: 'ir', fase }), [])
  const cambiarFiltros = useCallback((parcial: Partial<FiltrosViajeForm>) => despachar({ tipo: 'filtros', parcial }), [])
  const cambiarVista = useCallback((parcial: Partial<VistaViajes>) => despachar({ tipo: 'vista', parcial }), [])
  const restablecer = useCallback(() => despachar({ tipo: 'restablecer', filtros: filtrosIniciales(pasaje, fechaHoyLima()) }), [pasaje])
  const aceptar = useCallback((valor: boolean) => despachar({ tipo: 'acepta', valor }), [])
  const cambiarMetodo = useCallback((metodo: MetodoCambio) => despachar({ tipo: 'metodo', metodo }), [])
  const cambiarTerminal = useCallback((terminal: ResultadoTerminal) => despachar({ tipo: 'terminal', terminal }), [])

  const confirmar = useCallback(async () => {
    const { viaje, asiento, metodo, terminal, intentos, acepta } = estadoRef.current
    if (!viaje || !asiento || enVuelo.current) return
    const tarifa = compararTarifas(pasaje.precio ?? 0, asiento.precio)
    if (tarifa.escenario === 'INFERIOR' && !acepta) return
    enVuelo.current = true
    despachar({ tipo: 'procesando' })
    try {
      let referencia: string | null = null
      if (tarifa.escenario === 'SUPERIOR') {
        const pago = await registrarPagoMock(metodo, terminal)
        const intento: IntentoPago = {
          numero: intentos.length + 1,
          metodo,
          resultado: pago.estado,
          monto: tarifa.montoAPagar,
          hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Lima' }),
          referencia: pago.referencia,
        }
        if (pago.estado === 'RECHAZADO') {
          despachar({
            tipo: 'intento',
            intento,
            aviso: 'El pago fue rechazado. La postergación no se aplicó y el pasaje conserva su viaje, asiento y estado originales. Puedes reintentar.',
          })
          return
        }
        despachar({ tipo: 'intento', intento, aviso: null })
        referencia = pago.referencia
      }
      await confirmarPostergacionMock()
      despachar({
        tipo: 'exito',
        resultado: { exito: true, viaje, asiento, comparacion: tarifa, metodo: tarifa.escenario === 'SUPERIOR' ? metodo : null, referencia },
      })
    } catch {
      despachar({ tipo: 'fallo' })
    } finally {
      enVuelo.current = false
    }
  }, [pasaje.precio])

  return {
    estado,
    comparacion,
    acciones: { elegirViaje, elegirAsiento, ir, cambiarFiltros, cambiarVista, restablecer, aceptar, cambiarMetodo, cambiarTerminal, confirmar },
  }
}
