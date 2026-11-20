import { ArrowLeft, ArrowRight, CalendarClock, Check, Loader2, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Stepper, type StepperStep } from '@/components/ui/Stepper'
import { formatearPrecio } from '@/features/clientes/utils/boleto'
import type { ViajeHistorial } from '@/types/cliente'
import { nombrePropio } from '@/utils/formato'
import { PanelCambio } from './components/PanelCambio'
import { PantallaResultado } from './components/PantallaResultado'
import { PasoAsiento } from './components/PasoAsiento'
import { PasoTarifa } from './components/PasoTarifa'
import { PasoViaje } from './components/PasoViaje'
import { usePostergacion, type Fase } from './usePostergacion'

interface PostergarPasajeDialogProps {
  pasaje: ViajeHistorial | null
  onClose: () => void
}

const INDICE_FASE: Record<Fase, number> = { validando: 0, viaje: 0, asiento: 1, tarifa: 2, procesando: 2, resultado: 3 }

function Contenido({ pasaje, onClose }: { pasaje: ViajeHistorial; onClose: () => void }) {
  const { estado, comparacion, acciones } = usePostergacion(pasaje)
  const { fase, viaje, asiento, resultado } = estado
  const procesando = fase === 'procesando'
  const terminado = fase === 'resultado'
  const exito = terminado && resultado?.exito === true

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape' && !procesando) {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', alTeclear, true)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', alTeclear, true)
    }
  }, [onClose, procesando])

  const pasos: StepperStep[] = [
    { id: 'viaje', label: 'Nuevo viaje', description: 'Ruta, fecha y horario', summary: viaje ? `${viaje.horaSalida} · ${viaje.tipoBus}` : undefined },
    { id: 'asiento', label: 'Asiento', description: 'Elige el asiento', summary: asiento ? `Asiento ${asiento.numero}` : undefined },
    {
      id: 'tarifa',
      label: 'Tarifa y pago',
      description: 'Diferencia y confirmación',
      summary: comparacion ? (comparacion.escenario === 'SUPERIOR' ? `Cobro ${formatearPrecio(comparacion.montoAPagar, pasaje.moneda)}` : 'Sin cobro') : undefined,
    },
  ]

  function alIrAPaso(indice: number) {
    if (procesando || terminado) return
    acciones.ir(indice === 0 ? 'viaje' : 'asiento')
  }

  const etiquetaConfirmar = comparacion?.escenario === 'SUPERIOR' ? 'Registrar pago y postergar' : 'Confirmar postergación'
  const puedeConfirmar = !!comparacion && (comparacion.escenario !== 'INFERIOR' || estado.acepta)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div className="animate-fade-in absolute inset-0 bg-scrim" onClick={procesando ? undefined : onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="postergar-titulo"
        className="animate-scale-in relative flex h-full max-h-[900px] w-full max-w-[1240px] flex-col overflow-hidden rounded-2xl border border-border bg-surface-card shadow-flyout"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-text">
              <CalendarClock className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="postergar-titulo" className="font-display text-lg font-semibold leading-tight text-text-900">
                Postergar pasaje
              </h2>
              <p className="truncate text-xs tabular-nums text-text-500">
                Boleto {pasaje.numeroBoleto} · {nombrePropio(pasaje.pasajero)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={procesando}
            aria-label="Cerrar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-500 transition-colors hover:bg-surface-hover hover:text-text-900 disabled:opacity-40"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {fase !== 'validando' && !(terminado && !exito) && (
          <div className="shrink-0 border-b border-border px-5 py-3 sm:px-6">
            <Stepper steps={pasos} current={INDICE_FASE[fase]} onStepClick={procesando || terminado ? undefined : alIrAPaso} />
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="scrollbar-thin hidden overflow-y-auto border-r border-border bg-surface-sunken/50 p-5 lg:block">
            <PanelCambio pasaje={pasaje} viaje={viaje} asiento={asiento} comparacion={comparacion} />
          </aside>

          <div className="scrollbar-thin min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
            {fase === 'validando' && (
              <div role="status" className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-sm text-text-500">
                <Loader2 className="h-6 w-6 animate-spin text-accent-text" aria-hidden="true" />
                Verificando que el pasaje se pueda postergar…
              </div>
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

            {fase === 'asiento' && viaje && <PasoAsiento pasaje={pasaje} viaje={viaje} asiento={asiento} onElegir={acciones.elegirAsiento} />}

            {(fase === 'tarifa' || procesando) && viaje && comparacion && (
              <div aria-busy={procesando} className={procesando ? 'pointer-events-none opacity-60 transition-opacity' : 'transition-opacity'}>
                <PasoTarifa
                  pasaje={pasaje}
                  viaje={viaje}
                  comparacion={comparacion}
                  acepta={estado.acepta}
                  metodo={estado.metodo}
                  terminal={estado.terminal}
                  intentos={estado.intentos}
                  aviso={estado.aviso}
                  onAceptar={acciones.aceptar}
                  onMetodo={acciones.cambiarMetodo}
                  onTerminal={acciones.cambiarTerminal}
                />
              </div>
            )}

            {terminado && resultado && <PantallaResultado pasaje={pasaje} resultado={resultado} />}
          </div>
        </div>

        {fase !== 'validando' && (
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface-card px-5 py-3.5 sm:px-6">
            {terminado ? (
              <>
                <span />
                <Button variant={exito ? 'accent' : 'outline'} onClick={onClose} iconLeft={exito ? <Check className="h-4 w-4" aria-hidden="true" /> : undefined}>
                  {exito ? 'Listo' : 'Cerrar'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  disabled={procesando}
                  onClick={fase === 'viaje' ? onClose : () => acciones.ir(fase === 'asiento' ? 'viaje' : 'asiento')}
                  iconLeft={fase === 'viaje' ? undefined : <ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                >
                  {fase === 'viaje' ? 'Cancelar' : 'Atrás'}
                </Button>

                {fase === 'viaje' && (
                  <Button variant="accent" disabled={!viaje} onClick={() => acciones.ir('asiento')} iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
                    Elegir asiento
                  </Button>
                )}
                {fase === 'asiento' && (
                  <Button variant="accent" disabled={!asiento} onClick={() => acciones.ir('tarifa')} iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
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
    </div>
  )
}

export function PostergarPasajeDialog({ pasaje, onClose }: PostergarPasajeDialogProps) {
  if (!pasaje) return null
  return createPortal(<Contenido key={pasaje.idPasaje} pasaje={pasaje} onClose={onClose} />, document.body)
}
