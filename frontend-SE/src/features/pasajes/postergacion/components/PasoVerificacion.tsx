import { IdCard, UserRound, Users } from 'lucide-react'
import { Checkbox } from '@/components/ui/Checkbox'
import { RadioCardGroup } from '@/components/ui/RadioCardGroup'
import type { ViajeHistorial } from '@/types/cliente'
import { nombrePropio } from '@/utils/formato'
import { documentosRequeridos, type Solicitante } from '../reglas'

interface PasoVerificacionProps {
  pasaje: ViajeHistorial
  solicitante: Solicitante | null
  verificados: string[]
  onSolicitante: (valor: Solicitante) => void
  onVerificar: (id: string, marcado: boolean) => void
}

const OPCIONES = [
  {
    value: 'TITULAR' as const,
    label: 'El pasajero titular',
    description: 'La persona a cuyo nombre está el boleto',
    icon: <UserRound className="h-4 w-4" aria-hidden="true" />,
  },
  {
    value: 'TERCERO' as const,
    label: 'Otra persona',
    description: 'Un familiar o tercero con carta poder',
    icon: <Users className="h-4 w-4" aria-hidden="true" />,
  },
]

export function PasoVerificacion({ pasaje, solicitante, verificados, onSolicitante, onVerificar }: PasoVerificacionProps) {
  const documentos = solicitante ? documentosRequeridos(solicitante, pasaje) : []

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-display text-lg font-semibold text-text-900">¿Quién solicita el cambio?</h3>
        <p className="mt-0.5 text-sm text-text-500">
          Revise los documentos antes de continuar. No se guardan en el sistema: solo se verifican en ventanilla.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-sunken/60 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-card text-text-500">
          <IdCard className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Titular del boleto</p>
          <p className="truncate text-sm font-semibold text-text-900">{nombrePropio(pasaje.pasajero)}</p>
          <p className="text-xs tabular-nums text-text-500">
            {pasaje.documento} · Boleto {pasaje.numeroBoleto}
          </p>
        </div>
      </div>

      <RadioCardGroup<Solicitante>
        legend="Persona que se presenta en ventanilla"
        name="solicitante-cambio"
        value={solicitante ?? ''}
        onChange={onSolicitante}
        options={OPCIONES}
        className="[&>div]:sm:grid-cols-2"
      />

      {solicitante && (
        <section aria-label="Documentos a verificar" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-card p-5 shadow-panel">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Marque cada documento que revisó</p>
          {documentos.map((documento) => (
            <Checkbox
              key={documento.id}
              checked={verificados.includes(documento.id)}
              onChange={(e) => onVerificar(documento.id, e.target.checked)}
              label={documento.texto}
            />
          ))}
        </section>
      )}
    </div>
  )
}
