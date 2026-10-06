import './botones.css'

/**
 * Botón de acción principal.
 *
 * `cargando` (opcional) añade el indicador de progreso y marca el botón como
 * ocupado para tecnologías asistivas. Por defecto está desactivado, así que
 * los usos existentes del botón se comportan exactamente igual que antes.
 */
export function BotonPrincipal({
  children,
  tipo = 'button',
  deshabilitado,
  onClick,
  ancho,
  cargando = false,
}) {
  return (
    <button
      type={tipo}
      className={`boton-principal${cargando ? ' boton-principal--cargando' : ''}`}
      disabled={deshabilitado}
      onClick={onClick}
      aria-busy={cargando ? 'true' : undefined}
      style={ancho ? { width: ancho } : undefined}
    >
      {cargando && <span className="boton-principal__girador" aria-hidden="true" />}
      <span className="boton-principal__contenido">{children}</span>
    </button>
  )
}
