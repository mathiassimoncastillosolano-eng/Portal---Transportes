import { Check, IdCard, UserRound, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ViajeHistorial } from '@/types/cliente'
import { cn } from '@/utils/cn'
import { nombrePropio } from '@/utils/formato'
import { documentosRequeridos, type Solicitante } from '../reglas'
import { EncabezadoPaso } from './EncabezadoPaso'

interface PasoVerificacionProps {
  pasaje: ViajeHistorial
  solicitante: Solicitante | null
  verificados: string[]
  onSolicitante: (valor: Solicitante) => void
  onVerificar: (id: string, marcado: boolean) => void
}

const OPCIONES: { valor: Solicitante; titulo: string; detalle: string; icono: LucideIcon }[] = [
  { valor: 'TITULAR', titulo: 'El titular', detalle: 'A su nombre está el boleto', icono: UserRound },
  { valor: 'TERCERO', titulo: 'Otra persona', detalle: 'Con carta poder del titular', icono: Users },
]

export function PasoVerificacion({ pasaje, solicitante, verificados, onSolicitante, onVerificar }: PasoVerificacionProps) {
  const documentos = solicitante ? documentosRequeridos(solicitante, pasaje) : []
  const revisados = documentos.filter((d) => verificados.includes(d.id)).length

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPaso paso={1} titulo="¿Quién solicita el cambio?" ayuda="Revise los documentos en ventanilla. No se guardan en el sistema." />

      <div className="flex items-center gap-3 rounded-2xl bg-route-50 px-4 py-3 ring-1 ring-route-100">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-brand-deep)] text-white">
          <IdCard className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-route-500">Titular del boleto</p>
          <p className="truncate text-sm font-semibold text-text-900">{nombrePropio(pasaje.pasajero)}</p>
          <p className="text-xs tabular-nums text-text-500">
            {pasaje.documento} · {pasaje.numeroBoleto}
          </p>
        </div>
      </div>

      <div role="radiogroup" aria-label="Persona que se presenta en ventanilla" className="grid gap-3 sm:grid-cols-2">
        {OPCIONES.map(({ valor, titulo, detalle, icono: Icono }) => {
          const activa = solicitante === valor
          return (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => onSolicitante(valor)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200',
                activa
                  ? 'border-accent-line bg-surface-selected shadow-panel'
                  : 'border-border bg-surface-card hover:-translate-y-0.5 hover:border-border-strong hover:shadow-panel',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                  activa ? 'bg-gradient-to-br from-ink-700 to-accent-500 text-white' : 'bg-surface-sunken text-text-500',
                )}
              >
                <Icono className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-text-900">{titulo}</span>
                <span className="block text-xs text-text-500">{detalle}</span>
              </span>
            </button>
          )
        })}
      </div>

      {solicitante && (
        <section aria-label="Documentos a revisar" className="animate-fade-in">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-500">Documentos revisados</p>
            <p className={cn('text-xs font-semibold tabular-nums', revisados === documentos.length ? 'text-accent-text' : 'text-text-500')}>
              {revisados} de {documentos.length}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {documentos.map((documento) => {
              const marcado = verificados.includes(documento.id)
              return (
                <button
                  key={documento.id}
                  type="button"
                  role="checkbox"
                  aria-checked={marcado}
                  onClick={() => onVerificar(documento.id, !marcado)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors duration-150',
                    marcado ? 'border-accent-line/60 bg-accent-50 text-text-900' : 'border-border bg-surface-card text-text-700 hover:bg-surface-hover',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                      marcado ? 'border-accent-500 bg-accent-500 text-white' : 'border-border-strong bg-surface-card',
                    )}
                  >
                    {marcado && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  </span>
                  {documento.texto}
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
