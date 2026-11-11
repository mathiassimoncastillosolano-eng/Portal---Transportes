import './botones.css'

export function BotonSecundario({ children, tipo = 'button', deshabilitado, onClick, variante = 'contorno' }) {
  const claseVariante = variante === 'fantasma' ? 'boton-secundario--fantasma' : 'boton-secundario--contorno'
  return (
    <button
      type={tipo}
      className={`boton-secundario ${claseVariante}`}
      disabled={deshabilitado}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
