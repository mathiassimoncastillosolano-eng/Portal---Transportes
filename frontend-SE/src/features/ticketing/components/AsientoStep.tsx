import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToastStore } from '@/stores/toastStore'
import { codigoDeAsiento } from '@/utils/asientos'
import { cn } from '@/utils/cn'
import { formatearFechaCorta } from '@/utils/formato'
import { useAsientos } from '../hooks/useAsientos'
import { useTicketWizard } from '../hooks/useTicketWizard'
import { MAX_ASIENTOS } from '../types'
import { SeatMap } from './SeatMap'
import { StepActions } from './StepActions'

/** Paso 2: selección de asientos (de 1 a `MAX_ASIENTOS`). El estado de ocupación viene del viaje + la sesión. */
export function AsientoStep() {
  const { viaje, asientos, agregarAsiento, quitarAsiento, tieneDatosAsiento, irA } = useTicketWizard()
  const { datos, cargando, error, recargar } = useAsientos(viaje?.id)
  const pushToast = useToastStore((s) => s.push)
  const [pendienteEliminar, setPendienteEliminar] = useState<number | null>(null)

  if (!viaje) return null

  // Los asientos ya ocupados dejan de contar como selección (por si se vendieron en otra ventanilla).
  const seleccionVigente = datos ? asientos.filter((a) => !datos.ocupados.includes(a)) : asientos
  const codigos = datos ? seleccionVigente.map((a) => codigoDeAsiento(a, datos.servicio.distribucion)) : []

  function alternar(numero: number) {
    if (seleccionVigente.includes(numero)) {
      if (tieneDatosAsiento(numero)) setPendienteEliminar(numero)
      else quitarAsiento(numero)
      return
    }
    if (seleccionVigente.length >= MAX_ASIENTOS) {
      pushToast({
        tone: 'info',
        title: 'Máximo de asientos alcanzado',
        description: `Ya seleccionaste ${MAX_ASIENTOS} de ${MAX_ASIENTOS} asientos permitidos por operación.`,
      })
      return
    }
    agregarAsiento(numero)
  }

  const codigoPendiente =
    pendienteEliminar !== null && datos ? codigoDeAsiento(pendienteEliminar, datos.servicio.distribucion) : ''

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-text-700">
        <span className="font-semibold text-text-900">
          {viaje.origen} → {viaje.destino}
        </span>
        <span className="tabular-nums">
          {formatearFechaCorta(viaje.fecha)} · {viaje.hora} h
        </span>
        {datos && (
          <span className="rounded-md border border-border-strong bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-700">
            {datos.servicio.nombre} · {datos.servicio.unidad}
          </span>
        )}
      </div>

      {cargando ? (
        <div role="status" aria-label="Cargando mapa de asientos" className="flex justify-center">
          <Skeleton className="h-[420px] w-full max-w-[260px] rounded-[28px]" />
        </div>
      ) : error || !datos ? (
        <ErrorState
          title="No pudimos cargar el mapa de asientos"
          description="Inténtalo de nuevo para ver la disponibilidad actualizada."
          onRetry={recargar}
        />
      ) : (
        <>
          {/* Contador + chips de asientos elegidos */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-sunken px-4 py-3">
            <p className="text-sm font-medium text-text-700" aria-live="polite">
              <span
                className={cn(
                  'font-semibold',
                  seleccionVigente.length === MAX_ASIENTOS ? 'text-accent-text' : 'text-text-900',
                )}
              >
                {seleccionVigente.length} de {MAX_ASIENTOS}
              </span>{' '}
              asientos seleccionados
            </p>
            {codigos.length > 0 && (
              <ul className="flex flex-wrap items-center gap-1.5" aria-label="Asientos elegidos">
                {seleccionVigente.map((numero, i) => (
                  <li key={numero}>
                    <button
                      type="button"
                      onClick={() => alternar(numero)}
                      className="animate-check-pop group flex items-center gap-1 rounded-full border border-accent-line/40 bg-accent-line/10 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-accent-text transition-colors hover:border-danger-500/50 hover:bg-danger-500/10 hover:text-danger-600"
                      aria-label={`Quitar asiento ${codigos[i]}`}
                    >
                      {codigos[i]}
                      <X className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <SeatMap
            servicio={datos.servicio}
            ocupados={datos.ocupados}
            seleccionados={seleccionVigente}
            puedeSeleccionarMas={seleccionVigente.length < MAX_ASIENTOS}
            onToggle={alternar}
          />
          <p className="mt-4 text-center text-sm text-text-500" aria-live="polite">
            {seleccionVigente.length === 0
              ? `${datos.viaje.capacidad - datos.ocupados.length} de ${datos.viaje.capacidad} asientos disponibles. Elige de 1 a ${MAX_ASIENTOS}.`
              : seleccionVigente.length < MAX_ASIENTOS
                ? 'Puedes elegir más asientos o continuar con los ya seleccionados.'
                : `Alcanzaste el máximo de ${MAX_ASIENTOS} asientos por operación.`}
          </p>
        </>
      )}

      <StepActions
        onBack={() => irA('viaje')}
        onContinue={() => irA('pasajeros')}
        continueDisabled={seleccionVigente.length === 0}
        continueLabel={seleccionVigente.length > 1 ? `Continuar con ${seleccionVigente.length} asientos` : 'Continuar'}
      />

      <Modal
        open={pendienteEliminar !== null}
        onClose={() => setPendienteEliminar(null)}
        title={`¿Eliminar asiento ${codigoPendiente}?`}
        description="Este asiento ya tiene información de pasajero registrada. Si continúas, estos datos se eliminarán de esta operación."
        size="sm"
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPendienteEliminar(null)}>
            Conservar
          </Button>
          <Button
            variant="danger"
            iconLeft={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              if (pendienteEliminar !== null) quitarAsiento(pendienteEliminar)
              setPendienteEliminar(null)
            }}
          >
            Sí, eliminar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
