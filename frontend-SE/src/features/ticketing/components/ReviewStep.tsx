import { useState, type ReactNode } from 'react'
import { CheckCircle2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useCatalogo } from '@/hooks/useCatalogo'
import { esServiceError, ticketingService, type ServiceError } from '@/services'
import { useToastStore } from '@/stores/toastStore'
import { useUIStore } from '@/stores/uiStore'
import { codigoDeAsiento } from '@/utils/asientos'
import { formatearFechaCorta, formatearMoneda } from '@/utils/formato'
import { useAsientos } from '../hooks/useAsientos'
import { useTicketWizard } from '../hooks/useTicketWizard'
import type { PasoId } from '../types'
import { aDatosPago, aDatosPasajero } from '../utils/validaciones'
import { StepActions } from './StepActions'

function Bloque({ titulo, paso, children }: { titulo: string; paso: PasoId; children: ReactNode }) {
  const { irA } = useTicketWizard()
  return (
    <section className="rounded-xl border border-border-subtle bg-surface-sunken/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">{titulo}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => irA(paso)}
          iconLeft={<Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
          aria-label={`Editar ${titulo.toLowerCase()}`}
        >
          Editar
        </Button>
      </div>
      <div className="space-y-0.5 text-sm text-text-700">{children}</div>
    </section>
  )
}

/** Paso 5: resumen completo de la operación (viaje, asientos, pasajeros y pago), con edición de pasos anteriores. */
export function ReviewStep() {
  const { viaje, asientos, pasajerosPorAsiento, pago, total, cantidadPasajes, irA, confirmar, quitarAsiento } =
    useTicketWizard()
  const { catalogo } = useCatalogo()
  const { datos } = useAsientos(viaje?.id)
  const branchId = useUIStore((s) => s.currentBranchId)
  const pushToast = useToastStore((s) => s.push)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<ServiceError | Error | null>(null)

  const metodo = catalogo?.metodosPago.find((m) => m.id === pago.metodoPagoId)
  const servicio = catalogo?.servicios.find((s) => s.id === viaje?.servicioId)
  const sede = catalogo?.agencias.find((a) => a.id === branchId) ?? catalogo?.agencias[0]

  if (!viaje || asientos.length === 0 || !metodo || !sede || !datos) return null

  async function registrar() {
    if (!viaje || !metodo || !sede) return
    setEnviando(true)
    setError(null)
    try {
      const comprobante = await ticketingService.registrarOperacion({
        viajeId: viaje.id,
        items: asientos.map((asiento) => ({
          asiento,
          pasajero: aDatosPasajero(pasajerosPorAsiento[asiento]!),
        })),
        pago: aDatosPago(pago, metodo, total),
        agenciaVentaId: sede.id,
      })
      pushToast({
        tone: 'success',
        title: comprobante.cantidadPasajes === 1 ? 'Pasaje registrado' : `${comprobante.cantidadPasajes} pasajes registrados`,
        description: comprobante.operacionId,
      })
      confirmar(comprobante)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Error desconocido')
      setError(err)
      pushToast({ tone: 'danger', title: 'No se pudo registrar la operación', description: err.message })
    } finally {
      setEnviando(false)
    }
  }

  const conflicto = error && esServiceError(error) && error.code === 'ASIENTO_OCUPADO'
  const asientoConflicto = conflicto && esServiceError(error) ? Number(error.details?.asiento) : null

  return (
    <div>
      {error && (
        <div className="mb-5" role="alert">
          {conflicto && asientoConflicto ? (
            <ErrorState
              title={`El asiento ${codigoDeAsiento(asientoConflicto, datos.servicio.distribucion)} ya no está disponible`}
              description="Otra ventanilla lo vendió justo ahora. Elige un reemplazo; el resto de los asientos y pasajeros se conserva."
              actions={
                <Button
                  size="sm"
                  onClick={() => {
                    quitarAsiento(asientoConflicto)
                    irA('asientos')
                  }}
                >
                  Elegir otro asiento
                </Button>
              }
            />
          ) : (
            <ErrorState
              title="No pudimos registrar la operación"
              description={error.message}
              onRetry={registrar}
            />
          )}
        </div>
      )}

      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <Bloque titulo="Viaje" paso="viaje">
          <p className="font-medium text-text-900">
            {viaje.origen} → {viaje.destino}
          </p>
          <p>
            {formatearFechaCorta(viaje.fecha)} · {viaje.hora} h
          </p>
          <p className="text-text-500">
            {viaje.codigo} · {servicio ? `${servicio.nombre} (${servicio.unidad})` : viaje.servicioId}
          </p>
        </Bloque>
        <Bloque titulo="Pago" paso="pago">
          <p className="font-medium text-text-900">{metodo.nombre}</p>
          {metodo.id === 'efectivo' ? (
            <p>Recibido {formatearMoneda(Number(pago.montoRecibido.replace(',', '.')))}</p>
          ) : (
            <p>
              {metodo.etiquetaReferencia}: {pago.referencia}
            </p>
          )}
          <p className="text-text-500">
            {cantidadPasajes} {cantidadPasajes === 1 ? 'pasaje' : 'pasajes'} · pago único de la operación
          </p>
        </Bloque>
      </div>

      <Bloque titulo={`Pasajeros (${cantidadPasajes})`} paso="pasajeros">
        <ul className="divide-y divide-border">
          {asientos.map((numero) => {
            const p = pasajerosPorAsiento[numero]
            return (
              <li key={numero} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium text-text-900">
                    {codigoDeAsiento(numero, datos.servicio.distribucion)}
                  </span>{' '}
                  — {p ? `${p.nombres} ${p.apellidos}` : 'Pendiente'}
                </span>
                <span className="shrink-0 text-text-500">{p?.tipoDocumento} {p?.numeroDocumento}</span>
              </li>
            )
          })}
        </ul>
      </Bloque>

      <Card className="mt-4 flex items-center justify-between gap-4 border-accent-line/30 bg-surface-selected p-4 shadow-none">
        <div>
          <p className="text-sm text-text-500">Sede de venta: {sede.name}</p>
          <p className="text-sm font-medium text-text-700">
            {cantidadPasajes} {cantidadPasajes === 1 ? 'pasaje' : 'pasajes'} · Total a registrar
          </p>
        </div>
        <p className="text-[28px] font-semibold leading-none tabular-nums text-text-900">{formatearMoneda(total)}</p>
      </Card>

      <StepActions
        onBack={() => irA('pago')}
        onContinue={registrar}
        continueLabel="Confirmar y registrar"
        continueIcon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
        loading={enviando}
      />
    </div>
  )
}
