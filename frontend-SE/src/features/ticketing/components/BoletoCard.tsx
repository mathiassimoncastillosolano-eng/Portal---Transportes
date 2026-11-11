import { Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ComprobantePasaje } from '@/types/pasaje'

interface BoletoCardProps {
  indice: number
  comprobante: ComprobantePasaje
  onDescargar: () => void
  onVer: () => void
}

/** Boleto individual en formato compacto de ticket: pasajero, asiento y código, con ver/descargar. */
export function BoletoCard({ indice, comprobante, onDescargar, onVer }: BoletoCardProps) {
  const { pasaje, pasajero, codigoAsiento } = comprobante
  const nombre = `${pasajero.nombres} ${pasajero.apellidos}`.trim()

  return (
    <article className="animate-fade-slide-up-sm flex flex-col rounded-2xl border border-border bg-surface-card transition-[border-color,transform] duration-200 ease-[var(--ease-premium)] hover:-translate-y-px hover:border-border-strong">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Boleto {String(indice).padStart(2, '0')}</p>
          <p className="mt-1 truncate text-sm font-semibold text-text-900">{nombre}</p>
          <p className="mt-0.5 truncate text-xs tabular-nums text-text-500">{pasaje.codigo}</p>
        </div>
        <span className="shrink-0 rounded-lg border border-accent-line/40 bg-accent-line/10 px-2.5 py-1 text-sm font-semibold tabular-nums text-accent-text">
          {codigoAsiento}
        </span>
      </div>
      <div className="flex gap-2 border-t border-dashed border-border-strong p-3">
        <Button variant="ghost" size="sm" className="flex-1" onClick={onVer} iconLeft={<Eye className="h-3.5 w-3.5" aria-hidden="true" />}>
          Ver
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={onDescargar} iconLeft={<Download className="h-3.5 w-3.5" aria-hidden="true" />}>
          Descargar
        </Button>
      </div>
    </article>
  )
}
