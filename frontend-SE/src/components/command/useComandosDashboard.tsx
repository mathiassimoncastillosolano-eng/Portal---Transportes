import { useMemo } from 'react'
import { Building2, CalendarRange, FilterX, MapPin, Bus } from 'lucide-react'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { dashboardService } from '@/services'
import { useDashboardFiltrosStore } from '@/stores/dashboardFiltrosStore'
import { useUIStore } from '@/stores/uiStore'
import type { FiltrosDashboard } from '@/types/dashboard'
import type { Comando } from './comando'

const GRUPO = 'Filtros del Dashboard'
const PERMISO = 'dashboard:ver'
const ICONO = 'h-4 w-4'

/**
 * Comandos que cambian los filtros del Dashboard desde la paleta (Ctrl K): período, agencia de salida, servicio
 * y destino. Las agencias, servicios y destinos se piden al mismo servicio que usa el Dashboard.
 * `habilitado` = el usuario puede ver el Dashboard; si no, no se pide nada y no hay comandos.
 */
export function useComandosDashboard(habilitado: boolean): Comando[] {
  const actualizar = useDashboardFiltrosStore((s) => s.actualizar)
  const limpiar = useDashboardFiltrosStore((s) => s.limpiar)
  const setActiveSection = useUIStore((s) => s.setActiveSection)
  const { data: opciones } = useAsyncResource(habilitado ? 'opciones-paleta' : null, () =>
    dashboardService.obtenerOpciones(),
  )

  return useMemo(() => {
    if (!habilitado) return []

    // Cada comando aplica su filtro (se combina con los que ya había) y muestra el Dashboard.
    const filtrar = (parcial: Partial<FiltrosDashboard>) => () => {
      actualizar(parcial)
      setActiveSection('dashboard')
    }
    const base = { grupo: GRUPO, permiso: PERMISO, soloAlBuscar: true }

    const periodos: Comando[] = [7, 30, 90].map((dias) => ({
      ...base,
      id: `periodo-${dias}`,
      titulo: `Ventas de los últimos ${dias} días`,
      descripcion: 'Cambiar el período del Dashboard',
      icono: <CalendarRange className={ICONO} />,
      claves: 'periodo fecha semana mes trimestre',
      ejecutar: filtrar({ periodo: `${dias}d` as FiltrosDashboard['periodo'] }),
    }))

    const agencias: Comando[] = (opciones?.agencias ?? []).map((a) => ({
      ...base,
      id: `agencia-${a.id}`,
      titulo: `Ventas de ${a.nombre}`,
      descripcion: 'Filtrar el Dashboard por agencia de salida',
      icono: <Building2 className={ICONO} />,
      claves: 'agencia sede salida origen',
      ejecutar: filtrar({ agenciaId: a.id }),
    }))

    const servicios: Comando[] = (opciones?.servicios ?? []).map((s) => ({
      ...base,
      id: `servicio-${s.id}`,
      titulo: `Servicio ${s.nombre}`,
      descripcion: 'Filtrar el Dashboard por tipo de bus',
      icono: <Bus className={ICONO} />,
      claves: 'servicio tipo bus',
      ejecutar: filtrar({ servicioId: s.id }),
    }))

    const destinos: Comando[] = (opciones?.destinos ?? []).map((ciudad) => ({
      ...base,
      id: `destino-${ciudad}`,
      titulo: `Viajes a ${ciudad}`,
      descripcion: 'Filtrar el Dashboard por destino',
      icono: <MapPin className={ICONO} />,
      claves: 'destino ciudad llegada',
      ejecutar: filtrar({ destino: ciudad }),
    }))

    const quitar: Comando = {
      ...base,
      id: 'quitar-filtros',
      titulo: 'Quitar filtros del Dashboard',
      descripcion: 'Volver a los últimos 30 días, sin filtros',
      icono: <FilterX className={ICONO} />,
      claves: 'limpiar borrar todos reiniciar',
      ejecutar: () => {
        limpiar()
        setActiveSection('dashboard')
      },
    }

    return [...periodos, ...agencias, ...servicios, ...destinos, quitar]
  }, [habilitado, opciones, actualizar, limpiar, setActiveSection])
}
