import { useCallback, useEffect, useState } from 'react'
import { catalogService } from '@/services'
import type { Agencia } from '@/types/agency'
import type { MetodoPago } from '@/types/pago'
import type { Servicio } from '@/types/servicio'
import type { Ruta } from '@/types/viaje'

export interface Catalogo {
  agencias: Agencia[]
  servicios: Servicio[]
  metodosPago: MetodoPago[]
  ciudades: string[]
  rutas: Ruta[]
}

// El catálogo casi no cambia: se carga una vez y se comparte entre componentes.
let cache: Promise<Catalogo> | null = null

function cargarCatalogo(): Promise<Catalogo> {
  cache ??= Promise.all([
    catalogService.listarAgencias(),
    catalogService.listarServicios(),
    catalogService.listarMetodosPago(),
    catalogService.listarCiudades(),
    catalogService.listarRutas(),
  ])
    .then(([agencias, servicios, metodosPago, ciudades, rutas]) => ({ agencias, servicios, metodosPago, ciudades, rutas }))
    .catch((error: unknown) => {
      cache = null // permite reintentar
      throw error
    })
  return cache
}

/** Catálogo compartido (agencias, servicios, métodos de pago, ciudades) con estados de carga/error. */
export function useCatalogo() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let activo = true
    cargarCatalogo().then(
      (data) => {
        if (activo) {
          setCatalogo(data)
          setError(false)
        }
      },
      () => {
        if (activo) setError(true)
      },
    )
    return () => {
      activo = false
    }
  }, [intento])

  const reintentar = useCallback(() => {
    setError(false)
    setIntento((n) => n + 1)
  }, [])

  return { catalogo, cargando: catalogo === null && !error, error, reintentar }
}
