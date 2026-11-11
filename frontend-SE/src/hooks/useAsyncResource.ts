import { useCallback, useEffect, useRef, useState } from 'react'

interface Resultado<T> {
  clave: string
  data?: T
  error: boolean
}

/**
 * Carga asíncrona con clave: cada vez que cambia `clave` se vuelve a pedir el
 * recurso y `cargando` es verdadero hasta que llega la respuesta de ESA clave
 * (así los filtros muestran estados de carga reales sin datos obsoletos).
 * `clave = null` desactiva la consulta. `reintentar` repite la última.
 */
export function useAsyncResource<T>(clave: string | null, cargar: () => Promise<T>) {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado<T> | null>(null)
  const cargarRef = useRef(cargar)
  const claveCompleta = clave === null ? null : `${clave}#${intento}`

  useEffect(() => {
    cargarRef.current = cargar
  })

  useEffect(() => {
    if (claveCompleta === null) return
    let activo = true
    cargarRef.current().then(
      (data) => {
        if (activo) setResultado({ clave: claveCompleta, data, error: false })
      },
      () => {
        if (activo) setResultado({ clave: claveCompleta, error: true })
      },
    )
    return () => {
      activo = false
    }
  }, [claveCompleta])

  const vigente = resultado !== null && resultado.clave === claveCompleta
  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  return {
    data: vigente ? resultado.data : undefined,
    cargando: claveCompleta !== null && !vigente,
    error: vigente && resultado.error,
    reintentar,
  }
}
