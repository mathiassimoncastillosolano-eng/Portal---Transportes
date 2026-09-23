import './botones.css'

export function BotonSecundario({ children, tipo = 'button', deshabilitado, onClick, variante = 'contorno', ...atributos }) {
  const claseVariante = variante === 'fantasma' ? 'boton-secundario--fantasma' : 'boton-secundario--contorno'
  return (
    <button
      {...atributos}
      type={tipo}
      className={`boton-secundario ${claseVariante}`}
      disabled={deshabilitado}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
