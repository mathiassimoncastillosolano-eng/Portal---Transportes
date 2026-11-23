import { ArrowLeft, ArrowRight, CalendarClock, Check, CircleAlert, Loader2, Timer, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Stepper, type StepperStep } from '@/components/ui/Stepper'
import { BoletoModal } from '@/features/clientes/components/BoletoModal'
import { formatearPrecio } from '@/features/clientes/utils/boleto'
import { formatearCuenta } from '@/features/ticketing/components/ReservaTemporal'
import { useSegundosRestantes } from '@/features/ticketing/hooks/useReservaTemporal'
import type { ViajeHistorial } from '@/types/cliente'
import { cn } from '@/utils/cn'
import { nombrePropio } from '@/utils/formato'
import { PanelCambio } from './components/PanelCambio'
import { PantallaResultado } from './components/PantallaResultado'
import { PasoAsiento } from './components/PasoAsiento'
import { PasoTarifa } from './components/PasoTarifa'
import { PasoVerificacion } from './components/PasoVerificacion'
import { PasoViaje } from './components/PasoViaje'
import { documentosRequeridos, pagoListoParaRegistrar, pasajeDespuesDelCambio } from './reglas'
import { useCambioViaje, type Fase } from './useCambioViaje'

interface PostergarPasajeDialogProps {
  pasaje: ViajeHistorial | null
  onClose: () => void
  /** Se llama al cerrar después de un cambio exitoso, para recargar la lista de pasajes. */
  onCambiado?: () => void
}

const INDICE_FASE: Record<Fase, number> = { validando: 0, verificacion: 0, viaje: 1, asiento: 2, tarifa: 3, procesando: 3, resultado: 4 }
const FASE_DE_INDICE: Fase[] = ['verificacion', 'viaje', 'asiento', 'tarifa']

function Contenido({ pasaje, onClose, onCambiado }: { pasaje: ViajeHistorial; onClose: () => void; onCambiado?: () => void }) {
  const { estado, acciones } = useCambioViaje(pasaje)
  const { fase, viaje, asiento, cotizacion, resultado } = estado
  const [verBoleto, setVerBoleto] = useState(false)
  const procesando = fase === 'procesando'
  const terminado = fase === 'resultado'
  const exito = terminado && resultado?.exito === true
  const segundos = useSegundosRestantes(estado.sesion?.expiraEn ?? null)

  function cerrar() {
    if (procesando) return
    if (exito) onCambiado?.()
    onClose()
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape' && !procesando && !verBoleto) {
        e.stopPropagation()
        if (exito) onCambiado?.()
        onClose()
      }
    }
    window.addEventListener('keydown', alTeclear, true)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', alTeclear, true)
    }
  }, [onClose, onCambiado, procesando, exito, verBoleto])

  const documentos = estado.solicitante ? documentosRequeridos(estado.solicitante, pasaje) : []
  const verificacionCompleta = documentos.length > 0 && documentos.every((d) => estado.verificados.includes(d.id))

  const pasos: StepperStep[] = [
    { id: 'verificacion', label: 'Verificación', description: 'Titular y documentos', summary: estado.solicitante === 'TERCERO' ? 'Tercero autorizado' : 'Titular' },
    { id: 'viaje', label: 'Nuevo viaje', description: 'Ruta, fecha y horario', summary: viaje ? `${viaje.horaSalida} · ${viaje.tipoBus}` : undefined },
    { id: 'asiento', label: 'Asiento', description: 'Elija el asiento', summary: asiento ? `Asiento ${asiento.numero}` : undefined },
    {
      id: 'tarifa',
      label: 'Tarifa',
      description: 'Diferencia y confirmación',
      summary: cotizacion ? (cotizacion.requierePago ? `Cobro ${formatearPrecio(cotizacion.montoAPagar, pasaje.moneda)}` : 'Sin cobro') : undefined,
    },
  ]

  // Solo se puede volver a pasos anteriores, nunca saltar hacia adelante.
  function alIrAPaso(indice: number) {
    if (procesando || terminado || indice >= INDICE_FASE[fase]) return
    acciones.ir(FASE_DE_INDICE[indice])
  }

  const puedeConfirmar =
    !!cotizacion &&
    (cotizacion.requierePago
      ? pagoListoParaRegistrar(estado.pago, cotizacion.montoAPagar)
      : !cotizacion.requiereAceptacion || estado.acepta)
  const etiquetaConfirmar = cotizacion?.requierePago ? 'Registrar pago' : 'Confirmar cambio'
  const mostrarReserva = segundos !== null && (fase === 'asiento' || fase === 'tarifa' || procesando)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div className="animate-fade-in absolute inset-0 bg-scrim" onClick={cerrar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cambiar-viaje-titulo"
        className="animate-scale-in relative flex h-full max-h-[900px] w-full max-w-[1240px] flex-col overflow-hidden rounded-2xl border border-border bg-surface-card shadow-flyout"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-text">
              <CalendarClock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="cambiar-viaje-titulo" className="font-display text-lg font-semibold leading-tight text-text-900">
                Cambiar viaje
              </h2>
              <p className="truncate text-xs tabular-nums text-text-500">
                Boleto {pasaje.numeroBoleto} · {nombrePropio(pasaje.pasajero)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {mostrarReserva && (
              <span
                role="timer"
                aria-label={`Reserva del asiento, quedan ${formatearCuenta(segundos)}`}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums',
                  segundos <= 60 ? 'border-status-out/40 bg-status-out/10 text-danger-500' : 'border-accent-line/40 bg-accent-line/10 text-accent-text',
                )}
              >
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
                Asiento reservado {formatearCuenta(segundos)}
              </span>
            )}
            <button
              type="button"
              onClick={cerrar}
              disabled={procesando}
              aria-label="Cerrar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-500 transition-colors hover:bg-surface-hover hover:text-text-900 disabled:opacity-40"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {fase !== 'validando' && !terminado && (
          <div className="shrink-0 border-b border-border px-5 py-3 sm:px-6">
            <Stepper steps={pasos} current={INDICE_FASE[fase]} onStepClick={procesando ? undefined : alIrAPaso} />
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="scrollbar-thin hidden overflow-y-auto border-r border-border bg-surface-sunken/50 p-5 lg:block">
            <PanelCambio pasaje={pasaje} viaje={viaje} asiento={asiento} cotizacion={cotizacion} />
          </aside>

          <div className="scrollbar-thin min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
            {estado.aviso && !terminado && (
              <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-danger-500/30 bg-danger-500/8 px-3 py-2.5 text-sm text-danger-500">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {estado.aviso}
              </p>
            )}

            {fase === 'validando' && (
              <div role="status" className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-sm text-text-500">
                <Loader2 className="h-6 w-6 animate-spin text-accent-text" aria-hidden="true" />
                Verificando que el pasaje se pueda cambiar…
              </div>
            )}

            {fase === 'verificacion' && (
              <PasoVerificacion
                pasaje={pasaje}
                solicitante={estado.solicitante}
                verificados={estado.verificados}
                onSolicitante={acciones.elegirSolicitante}
                onVerificar={acciones.verificar}
              />
            )}

            {fase === 'viaje' && (
              <PasoViaje
                pasaje={pasaje}
                filtros={estado.filtros}
                vista={estado.vista}
                viaje={viaje}
                onFiltros={acciones.cambiarFiltros}
                onVista={acciones.cambiarVista}
                onRestablecer={acciones.restablecer}
                onElegir={acciones.elegirViaje}
              />
            )}

            {fase === 'asiento' && viaje && (
              <PasoAsiento
                pasaje={pasaje}
                viaje={viaje}
                asiento={asiento}
                apartando={estado.apartando}
                cotizacion={cotizacion}
                onAlternar={(a) => void acciones.alternarAsiento(a)}
                onAsientoLiberado={acciones.asientoLiberadoEnServidor}
              />
            )}

            {(fase === 'tarifa' || procesando) && viaje && cotizacion && (
              <div aria-busy={procesando} className={procesando ? 'pointer-events-none opacity-60 transition-opacity' : 'transition-opacity'}>
                <PasoTarifa
                  pasaje={pasaje}
                  viaje={viaje}
                  cotizacion={cotizacion}
                  acepta={estado.acepta}
                  pago={estado.pago}
                  intentos={estado.intentos}
                  onAceptar={acciones.aceptar}
                  onPago={acciones.cambiarPago}
                />
              </div>
            )}

            {terminado && resultado && (
              <PantallaResultado
                pasaje={pasaje}
                resultado={resultado}
                cotizacion={cotizacion}
                pisoNuevo={asiento?.piso ?? null}
                tipoBus={viaje?.tipoBus ?? null}
                onVerBoleto={() => setVerBoleto(true)}
              />
            )}
          </div>
        </div>

        {fase !== 'validando' && (
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface-card px-5 py-3.5 sm:px-6">
            {terminado ? (
              <>
                <span />
                <Button variant={exito ? 'accent' : 'outline'} onClick={cerrar} iconLeft={exito ? <Check className="h-4 w-4" aria-hidden="true" /> : undefined}>
                  {exito ? 'Listo' : 'Cerrar'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  disabled={procesando}
                  onClick={fase === 'verificacion' ? cerrar : () => acciones.ir(FASE_DE_INDICE[INDICE_FASE[fase] - 1])}
                  iconLeft={fase === 'verificacion' ? undefined : <ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                >
                  {fase === 'verificacion' ? 'Cancelar' : 'Atrás'}
                </Button>

                {fase === 'verificacion' && (
                  <Button variant="accent" disabled={!verificacionCompleta} onClick={() => acciones.ir('viaje')} iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
                    Continuar
                  </Button>
                )}
                {fase === 'viaje' && (
                  <Button variant="accent" disabled={!viaje} onClick={() => acciones.ir('asiento')} iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
                    Elegir asiento
                  </Button>
                )}
                {fase === 'asiento' && (
                  <Button
                    variant="accent"
                    disabled={!asiento || !cotizacion || estado.apartando !== null}
                    onClick={() => acciones.ir('tarifa')}
                    iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  >
                    Continuar
                  </Button>
                )}
                {(fase === 'tarifa' || procesando) && (
                  <Button variant="accent" loading={procesando} disabled={!puedeConfirmar} onClick={() => void acciones.confirmar()}>
                    {etiquetaConfirmar}
                  </Button>
                )}
              </>
            )}
          </footer>
        )}
      </div>

      {verBoleto && exito && resultado?.confirmacion && viaje && asiento && (
        <BoletoModal viaje={pasajeDespuesDelCambio(pasaje, resultado.confirmacion, viaje, asiento)} onClose={() => setVerBoleto(false)} />
      )}
    </div>
  )
}

export function PostergarPasajeDialog({ pasaje, onClose, onCambiado }: PostergarPasajeDialogProps) {
  if (!pasaje) return null
  return createPortal(<Contenido key={pasaje.idPasaje} pasaje={pasaje} onClose={onClose} onCambiado={onCambiado} />, document.body)
}
