import type { ReactNode } from 'react'

/** Tooltip de gráficos con tokens (respeta claro/oscuro). */
export function ChartTooltip({ titulo, filas }: { titulo: string; filas: { etiqueta: string; valor: ReactNode }[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface-card px-3 py-2 text-xs shadow-flyout">
      <p className="mb-1 font-semibold text-text-900">{titulo}</p>
      {filas.map((f) => (
        <p key={f.etiqueta} className="flex justify-between gap-4 text-text-700">
          <span className="text-text-500">{f.etiqueta}</span>
          <span className="font-medium tabular-nums">{f.valor}</span>
        </p>
      ))}
    </div>
  )
}
