import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { PageContainer } from '@/components/navigation/PageContainer'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToastStore } from '@/stores/toastStore'
import { AsientoStep } from './components/AsientoStep'
import { BookingStepper } from './components/BookingStepper'
import { BookingConfirmation } from './components/BookingConfirmation'
import { PasajerosStep } from './components/PasajerosStep'
import { PaymentForm } from './components/PaymentForm'
import { ReviewStep } from './components/ReviewStep'
import { TripPicker } from './components/TripPicker'
import { TripSummary, TripSummaryBar } from './components/TripSummary'
import { useTicketWizard } from './hooks/useTicketWizard'
import type { PasoId } from './types'

/** Subtítulo contextual: dice qué se espera del usuario en el paso actual. */
const descripciones: Record<PasoId, string> = {
  viaje: 'Selecciona el horario que deseas registrar.',
  asientos: 'Selecciona los asientos disponibles.',
  pasajeros: 'Registra la información de los pasajeros.',
  pago: 'Completa el pago del pasaje.',
  revision: 'Verifica la información antes de confirmar.',
  confirmacion: 'Operación completada.',
}

const descripcionInicial = 'Selecciona un viaje, horario y completa la información del pasajero.'

/**
 * Flujo "Operaciones › Registrar pasaje": Viaje → Asientos → Pasajeros →
 * Pago → Confirmación (verificación) → Registrado. Admite de 1 a 6
 * asientos/pasajeros por operación, con un único pago y un boleto por
 * pasajero. Los pasos son estado del asistente (sin rutas), así que volver
 * atrás conserva viaje, filtros, asientos y datos.
 *
 * Composición: cabecera de página → stepper → [contenido del paso | resumen
 * sticky del viaje]. Por debajo de `lg` el resumen pasa a una barra inferior.
 */
export function TicketingFlow() {
  const { paso, viaje, tieneDatos, reiniciar } = useTicketWizard()
  const pushToast = useToastStore((s) => s.push)
  const [confirmandoSalida, setConfirmandoSalida] = useState(false)
  const enConfirmacion = paso === 'confirmacion'

  function cancelar() {
    if (tieneDatos) setConfirmandoSalida(true)
    else reiniciar()
  }

  function salir() {
    setConfirmandoSalida(false)
    reiniciar()
    pushToast({ tone: 'info', title: 'Registro cancelado', description: 'No se emitió ningún pasaje.' })
  }

  const subtitulo = paso === 'viaje' && !viaje ? descripcionInicial : descripciones[paso]

  return (
    <PageContainer
      title="Registrar pasaje"
      description={subtitulo}
      className={!enConfirmacion ? 'pb-24 lg:pb-0' : undefined}
      actions={
        !enConfirmacion && (
          <Button variant="ghost" size="sm" onClick={cancelar} iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
            Cancelar registro
          </Button>
        )
      }
    >
      <div className="no-print rounded-[var(--radius-card)] border border-border bg-surface-card px-5 py-3.5 shadow-panel">
        <BookingStepper />
      </div>

      <div
        className={
          enConfirmacion
            ? 'mx-auto w-full max-w-4xl'
            : 'grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]'
        }
      >
        {/* `key` por paso: al cambiar de paso el contenido entra con un fade/slide corto. */}
        <div key={paso} className="animate-step-swap min-w-0">
          {paso === 'viaje' ? (
            <TripPicker />
          ) : paso === 'confirmacion' ? (
            <BookingConfirmation />
          ) : (
            <div className="rounded-2xl border border-border bg-surface-card p-5 shadow-panel sm:p-6">
              {paso === 'asientos' && <AsientoStep />}
              {paso === 'pasajeros' && <PasajerosStep />}
              {paso === 'pago' && <PaymentForm />}
              {paso === 'revision' && <ReviewStep />}
            </div>
          )}
        </div>

        {/* Sin `items-start` en el grid: esta columna mide lo mismo que la lista y el aside sticky recorre esa altura. */}
        {!enConfirmacion && (
          <div className="no-print min-w-0">
            <TripSummary />
          </div>
        )}
      </div>

      {!enConfirmacion && <TripSummaryBar />}

      <Modal open={confirmandoSalida} onClose={() => setConfirmandoSalida(false)} title="¿Salir del registro?" size="sm">
        {viaje && (
          <div className="mb-4 rounded-xl border border-border bg-surface-sunken px-4 py-3">
            <p className="text-xs text-text-500">Has seleccionado:</p>
            <p className="mt-1 text-sm font-semibold text-text-900">
              {viaje.origen} → {viaje.destino}
            </p>
            <p className="text-sm tabular-nums text-text-700">{viaje.hora}</p>
          </div>
        )}
        <p className="mb-5 text-sm text-text-500">Tu progreso se perderá y no se emitirá ningún pasaje.</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={salir}>
            Salir
          </Button>
          <Button variant="accent" onClick={() => setConfirmandoSalida(false)} autoFocus>
            Continuar registro
          </Button>
        </div>
      </Modal>
    </PageContainer>
  )
}
