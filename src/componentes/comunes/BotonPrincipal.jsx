import './botones.css'

export function BotonPrincipal({ children, tipo = 'button', deshabilitado, onClick, ancho }) {
  return (
    <button
      type={tipo}
      className="boton-principal"
      disabled={deshabilitado}
      onClick={onClick}
      style={ancho ? { width: ancho } : undefined}
    >
      {children}
    </button>
  )
}
