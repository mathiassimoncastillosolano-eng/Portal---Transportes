import { useState } from 'react'
import { DashboardView } from '@/features/dashboard/DashboardView'
import { DashboardComercial } from '@/features/dashboard/comercial/DashboardComercial'
import { DATOS_EJEMPLO, FECHA_CORTE } from '@/features/dashboard/comercial/datosEjemplo'

export function DashboardSection() {
  const [vista, setVista] = useState<'actual' | 'comercial'>('actual')

  return (
    <div className="space-y-5">
      <div className="mx-auto flex w-full max-w-[1400px] justify-end">
        <div className="inline-flex flex-wrap rounded-xl border border-border bg-surface-card p-1" role="group" aria-label="Vista del dashboard">
          <button type="button" onClick={() => setVista('actual')} aria-pressed={vista === 'actual'} className={`rounded-lg px-3 py-2 text-sm font-semibold ${vista === 'actual' ? 'bg-surface-sunken text-text-900' : 'text-text-500 hover:text-text-900'}`}>Panel actual</button>
          <button type="button" onClick={() => setVista('comercial')} aria-pressed={vista === 'comercial'} className={`rounded-lg px-3 py-2 text-sm font-semibold ${vista === 'comercial' ? 'bg-surface-sunken text-text-900' : 'text-text-500 hover:text-text-900'}`}>Diseño comercial · ejemplo</button>
        </div>
      </div>
      {vista === 'actual'
        ? <DashboardView />
        : <DashboardComercial dias={DATOS_EJEMPLO} fechaCorte={FECHA_CORTE} modoEjemplo integrado />}
    </div>
  )
}
