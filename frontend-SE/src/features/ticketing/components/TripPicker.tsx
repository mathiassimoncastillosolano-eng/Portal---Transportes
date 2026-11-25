import { useEffect, useMemo } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { fechaHoyLima } from '@/utils/fechas'
import { esCampoDeTexto, hayModalAbierto } from '@/utils/teclado'
import { useBusquedaViajes } from '../hooks/useBusquedaViajes'
import { useRutasCiudad } from '../hooks/useRutasCiudad'
import { useTicketWizard } from '../hooks/useTicketWizard'
import { vistaViajesInicial } from '../types'
import { ordenarViajes } from '../utils/viajes'
import { ScheduleFilter } from './ScheduleFilter'
import { TravelFilters } from './TravelFilters'
import { TravelList } from './TravelList'
import { TripResultsBar } from './TripResultsBar'

export function TripPicker() {
  const { filtros, setFiltros, vista, setVista, restablecerFiltros, viaje, seleccionarViaje, irA } = useTicketWizard()
  const { rutas, cargando: cargandoRutas, error: errorRutas, reintentar: reintentarRutas } = useRutasCiudad()
  const hoy = fechaHoyLima()

  const rutaInicial = useMemo(() => rutas.find((r) => r.origen === 'Lima') ?? rutas[0], [rutas])

  useEffect(() => {
    if (!rutaInicial) return
    const valida = rutas.some((r) => r.origen === filtros.origen && r.destino === filtros.destino)
    if (!valida) setFiltros({ origen: rutaInicial.origen, destino: rutaInicial.destino })
  }, [rutas, rutaInicial, filtros.origen, filtros.destino, setFiltros])

  const errorFecha = !filtros.fecha ? 'Selecciona una fecha.' : filtros.fecha < hoy ? 'Los viajes anteriores a hoy ya salieron.' : undefined
  const listoParaBuscar = !!filtros.origen && !!filtros.destino && !errorFecha
  const consulta = useMemo(
    () => (listoParaBuscar ? { origen: filtros.origen, destino: filtros.destino, fecha: filtros.fecha, franjas: vista.franjas } : null),
    [listoParaBuscar, filtros.origen, filtros.destino, filtros.fecha, vista.franjas],
  )
  const { viajes, cargando, error, reintentar } = useBusquedaViajes(consulta)

  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || hayModalAbierto()) return
      if (e.key === '/' && !esCampoDeTexto(e.target)) {
        e.preventDefault()
        document.getElementById('filtro-origen')?.focus()
      } else if (e.key === 'Enter' && viaje && document.activeElement === document.body) {
        irA('asientos')
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [viaje, irA])

  const visibles = useMemo(() => ordenarViajes(viajes, vista.orden), [viajes, vista.orden])

  const hayFiltros =
    (!!rutaInicial && (filtros.origen !== rutaInicial.origen || filtros.destino !== rutaInicial.destino)) ||
    filtros.fecha !== hoy ||
    vista.franjas.length > 0 ||
    vista.orden !== vistaViajesInicial.orden

  if (cargandoRutas) {
    return (
      <div role="status" aria-label="Cargando rutas" className="flex flex-col gap-3">
        <Skeleton className="h-[120px] w-full rounded-2xl" />
        <Skeleton className="h-[176px] w-full rounded-2xl" />
      </div>
    )
  }

  if (errorRutas) {
    return <ErrorState title="No pudimos cargar las rutas" description="Revisa tu conexión e inténtalo de nuevo." onRetry={reintentarRutas} />
  }

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Búsqueda de viajes"
        className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-card shadow-panel"
      >
        <TravelFilters filtros={filtros} rutas={rutas} hoy={hoy} errorFecha={errorFecha} onFiltros={setFiltros} />
        <div className="border-t border-border px-4 py-2.5">
          <ScheduleFilter franjas={vista.franjas} onChange={(franjas) => setVista({ franjas })} />
        </div>
      </section>

      <TripResultsBar
        total={visibles.length}
        cargando={cargando}
        orden={vista.orden}
        hayFiltros={hayFiltros}
        onOrden={(orden) => setVista({ orden })}
        onReset={restablecerFiltros}
      />

      <div aria-live="polite">
        <TravelList
          viajes={visibles}
          cargando={cargando}
          error={error}
          seleccionadoId={viaje?.id}
          hayFiltros={hayFiltros}
          onSelect={seleccionarViaje}
          onReintentar={reintentar}
          onReset={restablecerFiltros}
        />
      </div>
    </div>
  )
}
