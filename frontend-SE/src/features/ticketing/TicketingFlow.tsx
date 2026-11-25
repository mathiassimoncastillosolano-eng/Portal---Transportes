import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { PageContainer } from '@/components/navigation/PageContainer'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToastStore } from '@/stores/toastStore'
import { AsientoStep } from './components/AsientoStep'
import { BookingStepper } from './components/BookingStepper'
import { PagoStep } from './components/PagoStep'
import { PasajerosStep } from './components/PasajerosStep'
import { TripPicker } from './components/TripPicker'
import { TripSummary, TripSummaryBar } from './components/TripSummary'
import { useVencimientoReserva } from './hooks/useReservaTemporal'
import { useTicketWizard } from './hooks/useTicketWizard'
import type { PasoId } from './types'

const descripciones: Record<PasoId, string> = {
  viaje: 'Selecciona el horario que deseas registrar.',
  asientos: 'Selecciona los asientos disponibles.',
  pasajeros: 'Registra la información de los pasajeros.',
  pago: 'Revisa el total y elige la forma de pago.',
}

const descripcionInicial = 'Selecciona un viaje, horario y completa la información del pasajero.'

export function TicketingFlow() {
  const { paso, viaje, asientos, tieneDatos, cancelarRegistro } = useTicketWizard()
  const pushToast = useToastStore((s) => s.push)
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)
  useVencimientoReserva()

  function cancelar() {
    if (tieneDatos) setConfirmandoSalida(true)
    else cancelarRegistro()
  }

  function salir() {
    setConfirmandoSalida(false)
    cancelarRegistro()
    pushToast({ tone: 'info', title: 'Registro cancelado', description: 'Se liberaron tus asientos reservados temporalmente.' })
  }

  const subtitulo = paso === 'viaje' && !viaje ? descripcionInicial : descripciones[paso]

  return (
    <PageContainer
      title="Registrar pasaje"
      description={subtitulo}
      className="pb-24 lg:pb-0"
      actions={
        <Button variant="ghost" size="sm" onClick={cancelar} iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
          Cancelar registro
        </Button>
      }
    >
      <div className="no-print rounded-[var(--radius-card)] border border-border bg-surface-card px-5 py-3.5 shadow-panel">
        <BookingStepper />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <div key={paso} className="animate-step-swap min-w-0">
          {paso === 'viaje' ? (
            <TripPicker />
          ) : (
            <div className="rounded-2xl border border-border bg-surface-card p-5 shadow-panel sm:p-6">
              {paso === 'asientos' && <AsientoStep />}
              {paso === 'pasajeros' && <PasajerosStep />}
              {paso === 'pago' && <PagoStep />}
            </div>
          )}
        </div>

        <div className="no-print min-w-0">
          <TripSummary />
        </div>
      </div>

      <TripSummaryBar />

      <Modal open={confirmandoSalida} onClose={() => setConfirmandoSalida(false)} title="¿Cancelar el registro?" size="sm">
        {viaje && (
          <div className="mb-4 rounded-xl border border-border bg-surface-sunken px-4 py-3">
            <p className="text-xs text-text-500">Has seleccionado:</p>
            <p className="mt-1 text-sm font-semibold text-text-900">
              {viaje.origen} → {viaje.destino}
            </p>
            <p className="text-sm tabular-nums text-text-700">
              {viaje.horaSalida}
              {asientos.length > 0 && ` · Asientos ${asientos.map((a) => a.numero).join(', ')}`}
            </p>
          </div>
        )}
        <p className="mb-5 text-sm text-text-500">
          Se liberarán los asientos que reservaste en esta sesión y volverás a la búsqueda. No se cancelará ningún viaje ni venta.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={salir}>
            Sí, cancelar registro
          </Button>
          <Button variant="accent" onClick={() => setConfirmandoSalida(false)} autoFocus>
            Continuar registro
          </Button>
        </div>
      </Modal>
    </PageContainer>
  )
}
