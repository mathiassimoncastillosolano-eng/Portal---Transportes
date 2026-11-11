import { useState } from 'react'
import { Building2, Bus, Filter, FilterX, Flag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { Catalogo } from '@/hooks/useCatalogo'
import type { FiltrosDashboard } from '@/types/dashboard'
import { cn } from '@/utils/cn'
import { formatearFecha } from '@/utils/formato'
import { FECHA_MAXIMA, FECHA_MINIMA, opcionesPeriodo } from '../utils/periodos'

interface DashboardFiltersProps {
  filtros: FiltrosDashboard
  catalogo: Catalogo | null
  errorRango: string | null
  hayCambios: boolean
  onChange: (parcial: Partial<FiltrosDashboard>) => void
  onClear: () => void
}

/** Barra de filtros combinables: período (7/30/90 días o rango), agencia, servicio y destino. Colapsable en pantallas estrechas. */
export function DashboardFilters({ filtros, catalogo, errorRango, hayCambios, onChange, onClear }: DashboardFiltersProps) {
  const [abierto, setAbierto] = useState(false)

  return (
    <Card className="no-print p-4">
      <div className="flex items-center justify-between lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAbierto((a) => !a)}
          aria-expanded={abierto}
          aria-controls="dashboard-filtros"
          iconLeft={<Filter className="h-4 w-4" aria-hidden="true" />}
        >
          Filtros{hayCambios ? ' (activos)' : ''}
        </Button>
        {hayCambios && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Limpiar
          </Button>
        )}
      </div>

      <div id="dashboard-filtros" className={cn('mt-4 flex-col gap-4 lg:mt-0 lg:flex', abierto ? 'flex' : 'hidden')}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <SegmentedControl
            label="Período"
            name="dashboard-periodo"
            value={filtros.periodo}
            options={opcionesPeriodo}
            onChange={(v) => onChange({ periodo: v as FiltrosDashboard['periodo'] })}
          />
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              label="Agencia"
              icon={<Building2 className="h-4 w-4" />}
              value={filtros.agenciaId}
              onChange={(v) => onChange({ agenciaId: v })}
              options={[{ value: 'todas', label: 'Todas las agencias' }, ...(catalogo?.agencias ?? []).map((a) => ({ value: a.id, label: a.name, description: a.location }))]}
            />
            <Select
              label="Servicio"
              icon={<Bus className="h-4 w-4" />}
              value={filtros.servicioId}
              onChange={(v) => onChange({ servicioId: v as FiltrosDashboard['servicioId'] })}
              options={[{ value: 'todos', label: 'Todos los servicios' }, ...(catalogo?.servicios ?? []).map((s) => ({ value: s.id, label: s.nombre, description: s.unidad }))]}
            />
            <Select
              label="Destino"
              icon={<Flag className="h-4 w-4" />}
              value={filtros.destino}
              onChange={(v) => onChange({ destino: v })}
              options={[{ value: '', label: 'Todos los destinos' }, ...(catalogo?.ciudades ?? []).map((c) => ({ value: c, label: c }))]}
            />
          </div>
          <Button
            variant="outline"
            onClick={onClear}
            disabled={!hayCambios}
            className="hidden lg:inline-flex"
            iconLeft={<FilterX className="h-4 w-4" aria-hidden="true" />}
          >
            Limpiar
          </Button>
        </div>

        {filtros.periodo === 'custom' && (
          <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Desde"
              type="date"
              min={FECHA_MINIMA}
              max={FECHA_MAXIMA}
              value={filtros.rango.desde}
              onChange={(e) => onChange({ rango: { ...filtros.rango, desde: e.target.value } })}
              error={errorRango ?? undefined}
            />
            <Input
              label="Hasta"
              type="date"
              min={FECHA_MINIMA}
              max={FECHA_MAXIMA}
              value={filtros.rango.hasta}
              onChange={(e) => onChange({ rango: { ...filtros.rango, hasta: e.target.value } })}
              hint={`Datos desde ${formatearFecha(FECHA_MINIMA)}`}
            />
          </div>
        )}
      </div>
    </Card>
  )
}
