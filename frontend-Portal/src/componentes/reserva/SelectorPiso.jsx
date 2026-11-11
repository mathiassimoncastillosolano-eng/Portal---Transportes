import './selectorPiso.css'

const SUBTITULO_POR_DEFECTO = { 1: 'Más espacio', 2: 'Mejores vistas', 3: 'Zona exclusiva' }

/**
 * Alterna entre pisos cuando el servicio tiene más de uno. El número de
 * botones surge de `pisos` (derivado de los datos mock del servicio): si el
 * servicio tiene un solo piso, este componente no debe renderizarse.
 */
export function SelectorPiso({ pisos, pisoActivo, alCambiarPiso, mapaPorPiso }) {
  if (pisos <= 1) return null

  return (
    <div className="selector-piso" role="tablist" aria-label="Selecciona el piso del bus">
      {Array.from({ length: pisos }, (_, indice) => indice + 1).map((piso) => {
        const info = mapaPorPiso[piso]
        const activo = piso === pisoActivo
        return (
          <button
            key={piso}
            type="button"
            role="tab"
            aria-selected={activo}
            className={`selector-piso__opcion ${activo ? 'selector-piso__opcion--activa' : ''}`}
            onClick={() => alCambiarPiso(piso)}
          >
            <span className="selector-piso__titulo">Piso {piso}</span>
            <span className="selector-piso__subtitulo">{info?.descripcion ?? SUBTITULO_POR_DEFECTO[piso] ?? ''}</span>
          </button>
        )
      })}
    </div>
  )
}
