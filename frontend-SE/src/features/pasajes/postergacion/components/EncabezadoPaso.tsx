import type { ReactNode } from 'react'

interface EncabezadoPasoProps {
  paso: number
  titulo: string
  ayuda?: string
  /** Algo pequeño a la derecha del título (por ejemplo, "En vivo"). */
  extra?: ReactNode
}

/** Título de cada paso del modal: "Paso X de 4", el título y una línea de ayuda corta. */
export function EncabezadoPaso({ paso, titulo, ayuda, extra }: EncabezadoPasoProps) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-text">Paso {paso} de 4</p>
        <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-text-900">{titulo}</h3>
        {ayuda && <p className="mt-1 text-sm text-text-500">{ayuda}</p>}
      </div>
      {extra}
    </div>
  )
}
