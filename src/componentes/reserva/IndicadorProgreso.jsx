import './indicadorProgreso.css'

const PASOS = [
  { clave: 'viaje', etiqueta: 'Viaje' },
  { clave: 'asiento', etiqueta: 'Asiento' },
  { clave: 'pasajero', etiqueta: 'Pasajero' },
  { clave: 'pago', etiqueta: 'Pago' },
]

export function IndicadorProgreso({ pasoActual }) {
  const indiceActual = PASOS.findIndex((paso) => paso.clave === pasoActual)

  return (
    <ol className="indicador-progreso" aria-label="Progreso de la compra">
      {PASOS.map((paso, indice) => {
        const completado = indice < indiceActual
        const activo = indice === indiceActual
        const estado = completado ? 'completado' : activo ? 'activo' : 'pendiente'

        return (
          <li key={paso.clave} className={`indicador-progreso__paso indicador-progreso__paso--${estado}`}>
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
            {indice < PASOS.length - 1 && <span className="indicador-progreso__linea" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
