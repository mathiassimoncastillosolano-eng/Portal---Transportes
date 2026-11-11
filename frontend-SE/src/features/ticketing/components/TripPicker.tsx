import { useEffect, useMemo } from 'react'
import { FECHA_REFERENCIA } from '@/config/referencia'
import { useCatalogo } from '@/hooks/useCatalogo'
import { esCampoDeTexto, hayModalAbierto } from '@/utils/teclado'
import { useTicketWizard } from '../hooks/useTicketWizard'
import { useTripSearch } from '../hooks/useTripSearch'
import { DESTINO_PREDETERMINADO, ORIGEN_PREDETERMINADO, vistaViajesInicial } from '../types'
import { coincideConHorario, ordenarViajes } from '../utils/viajes'
import { ScheduleFilter } from './ScheduleFilter'
import { TravelFilters } from './TravelFilters'
import { TravelList } from './TravelList'
import { TripResultsBar } from './TripResultsBar'

/**
 * Paso 1: encontrar y elegir el viaje.
 *  - Búsqueda (origen, destino, fecha) → consulta al servicio.
 *    Arranca en Lima → Cusco; no existe una opción "Todos".
 *  - Horario (franjas) y orden → se aplican en el cliente sobre lo ya
 *    cargado, por eso responden al instante.
 * Todo el estado vive en el wizard: al volver desde "Asientos" la lista está
 * exactamente como se dejó.
 */
export function TripPicker() {
  const { filtros, setFiltros, vista, setVista, restablecerFiltros, viaje, seleccionarViaje, irA } = useTicketWizard()
  const { catalogo } = useCatalogo()
  const { viajes, cargando, error, reintentar } = useTripSearch(filtros)

  // Atajos: "/" enfoca la búsqueda; Enter (sin foco en un control) continúa con el viaje elegido.
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

  const visibles = useMemo(
    () =>
      ordenarViajes(
        viajes.filter((v) => coincideConHorario(v.hora, vista.franjas)),
        vista.orden,
      ),
    [viajes, vista.franjas, vista.orden],
  )

  const errorFecha = !filtros.fecha
    ? 'Selecciona una fecha.'
    : filtros.fecha < FECHA_REFERENCIA
      ? 'Los viajes anteriores a hoy ya salieron.'
      : undefined

  const hayFiltros =
    filtros.origen !== ORIGEN_PREDETERMINADO ||
    filtros.destino !== DESTINO_PREDETERMINADO ||
    filtros.fecha !== FECHA_REFERENCIA ||
    vista.franjas.length > 0 ||
    vista.orden !== vistaViajesInicial.orden

  return (
    <div className="flex flex-col gap-4">
      {/* Un único panel de búsqueda: campos arriba, horario debajo, separados por una línea fina. */}
      <section
        aria-label="Búsqueda de viajes"
        className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-card shadow-panel"
      >
        <TravelFilters filtros={filtros} catalogo={catalogo} errorFecha={errorFecha} onFiltros={setFiltros} />
        <div className="border-t border-border px-4 py-2.5">
          <ScheduleFilter franjas={vista.franjas} onChange={(franjas) => setVista({ franjas })} disabled={cargando} />
        </div>
      </section>

      <TripResultsBar
        total={visibles.length}
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
          catalogo={catalogo}
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
