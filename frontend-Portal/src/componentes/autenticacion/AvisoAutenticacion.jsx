import './avisoAutenticacion.css'

const ICONOS = {
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5.5M12 16.2v.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  exito: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12.3l2.6 2.6L16 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

/**
 * Mensaje de estado compartido por las pantallas y los modales de
 * autenticación: errores del backend, errores de validación general y
 * confirmaciones. Un solo componente garantiza que login y registro
 * muestren el mismo tratamiento visual.
 *
 * `tono`: 'error' | 'exito'. Los errores se anuncian con role="alert" y las
 * confirmaciones con role="status", que es el comportamiento esperado por los
 * lectores de pantalla en cada caso.
 */
export function AvisoAutenticacion({ tono = 'error', children }) {
  if (!children) return null

  const esError = tono === 'error'

  return (
    <p
      className={`aviso-autenticacion aviso-autenticacion--${esError ? 'error' : 'exito'}`}
      role={esError ? 'alert' : 'status'}
    >
      <span className="aviso-autenticacion__icono">{ICONOS[esError ? 'error' : 'exito']}</span>
      <span className="aviso-autenticacion__texto">{children}</span>
    </p>
  )
}
