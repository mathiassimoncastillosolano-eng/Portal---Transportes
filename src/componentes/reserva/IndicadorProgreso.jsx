import './indicadorProgreso.css'

const PASOS = [
  { clave: 'viaje', etiqueta: 'Viaje' },
  { clave: 'asiento', etiqueta: 'Asiento' },
  { clave: 'pasajero', etiqueta: 'Pasajero' },
  { clave: 'pago', etiqueta: 'Pago' },
]

export function IndicadorProgreso({ pasoActual, pasos = PASOS, etiqueta = 'Progreso de la compra' }) {
  const indiceActual = pasos.findIndex((paso) => paso.clave === pasoActual)

  return (
    <ol className="indicador-progreso" aria-label={etiqueta}>
      {pasos.map((paso, indice) => {
        const completado = indice < indiceActual
        const activo = indice === indiceActual
        const estado = completado ? 'completado' : activo ? 'activo' : 'pendiente'

        return (
          <li key={paso.clave} className={`indicador-progreso__paso indicador-progreso__paso--${estado}`} aria-current={activo ? 'step' : undefined}>
            <span className="indicador-progreso__marcador" aria-hidden="true">
              {completado ? (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7.3 5.5 10.3 11.5 3.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                indice + 1
              )}
            </span>
            <span className="indicador-progreso__etiqueta">{paso.etiqueta}</span>
            {indice < pasos.length - 1 && <span className="indicador-progreso__linea" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
