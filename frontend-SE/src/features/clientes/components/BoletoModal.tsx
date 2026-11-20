import { useState, type ReactNode } from 'react'
import { ArrowRight, Download } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToastStore } from '@/stores/toastStore'
import type { ViajeHistorial } from '@/types/cliente'
import { cn } from '@/utils/cn'
import { nombrePropio } from '@/utils/formato'
import { descargarPdfBoleto, ETIQUETA_ESTADO, formatearPrecio, textoLlegada, textoSalida, tituloDocumento } from '../utils/boleto'

interface BoletoModalProps {
  viaje: ViajeHistorial | null
  onClose: () => void
}

function Dato({ etiqueta, children, className }: { etiqueta: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-500">{etiqueta}</dt>
      <dd className="mt-1 break-words text-sm font-medium leading-snug text-text-900">{children}</dd>
    </div>
  )
}

export function BoletoModal({ viaje, onClose }: BoletoModalProps) {
  const [descargando, setDescargando] = useState(false)
  const pushToast = useToastStore((s) => s.push)

  async function descargar() {
    if (!viaje) return
    setDescargando(true)
    try {
      await descargarPdfBoleto(viaje)
    } catch {
      pushToast({ tone: 'danger', title: 'No se pudo generar el PDF', description: 'Inténtalo de nuevo en unos segundos.' })
    } finally {
      setDescargando(false)
    }
  }

  const llegada = viaje ? textoLlegada(viaje) : null

  return (
    <Modal open={viaje !== null} onClose={onClose} title={viaje ? tituloDocumento(viaje) : 'Boleto'} size="md">
      {viaje && (
        <div className="flex flex-col gap-5">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-card shadow-sm">
            <div className="bg-[image:var(--gradient-brand-deep)] px-5 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">RutaLibre</p>
                <Badge tone={viaje.estadoPasaje === 'CONFIRMADA' ? 'success' : viaje.estadoPasaje === 'REEMBOLSADA' ? 'warning' : 'neutral'}>
                  {ETIQUETA_ESTADO[viaje.estadoPasaje]}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <p className="min-w-0 flex-1 break-words font-display text-xl font-semibold leading-tight">{viaje.origen}</p>
                <ArrowRight className="h-5 w-5 shrink-0 text-white/70" aria-hidden="true" />
                <p className="min-w-0 flex-1 break-words text-right font-display text-xl font-semibold leading-tight">{viaje.destino}</p>
              </div>
              <div className="mt-2 flex items-start justify-between gap-3 text-xs tabular-nums text-white/75">
                <span>{textoSalida(viaje)}</span>
                <span className="text-right">{llegada ? `Llega ${llegada}` : 'Llegada sin registrar'}</span>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 px-5 py-5">
              <Dato etiqueta="Pasajero" className="col-span-2">
                {viaje.pasajero ? nombrePropio(viaje.pasajero) : '—'}
              </Dato>
              <Dato etiqueta="Documento">{viaje.documento || '—'}</Dato>
              <Dato etiqueta="Asiento">{`${viaje.asiento ?? '—'}${viaje.piso ? ` · Piso ${viaje.piso}` : ''}`}</Dato>
              <Dato etiqueta="Bus" className="col-span-2">
                {viaje.bus ?? '—'}
              </Dato>
            </dl>

            <div className="border-t border-dashed border-border-strong" />

            <div className="grid grid-cols-[1fr_auto] items-end gap-x-5 gap-y-4 bg-surface-sunken/50 px-5 py-5">
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
                <Dato etiqueta="Boleto">
                  <span className="tabular-nums">{viaje.numeroBoleto}</span>
                </Dato>
                <Dato etiqueta="Compra">
                  <span className="tabular-nums">{viaje.codigoCompra}</span>
                </Dato>
                <Dato etiqueta="Comprobante" className="col-span-2">
                  <span className="tabular-nums">{viaje.comprobante ?? '—'}</span>
                </Dato>
              </dl>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-500">Precio</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text-900">{formatearPrecio(viaje.precio, viaje.moneda)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              variant="accent"
              loading={descargando}
              onClick={() => void descargar()}
              iconLeft={<Download className="h-4 w-4" aria-hidden="true" />}
            >
              Descargar PDF
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
