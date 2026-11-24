import { IconoAyuda } from './IconoAyuda'

export function NavegacionAyuda({ categorias, activa, alElegir }) {
  return (
    <>
      <div className="centro-ayuda__selector">
        <label className="centro-ayuda__selector-etiqueta" htmlFor="centro-ayuda-categoria">
          Categoría
        </label>
        <select
          id="centro-ayuda-categoria"
          className="centro-ayuda__selector-campo"
          value={activa ?? ''}
          onChange={(evento) => alElegir(evento.target.value || null)}
        >
          <option value="">Inicio</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <nav className="centro-ayuda__nav" aria-label="Categorías de ayuda">
        <button
          type="button"
          className={`centro-ayuda__nav-boton ${activa === null ? 'centro-ayuda__nav-boton--activo' : ''}`}
          onClick={() => alElegir(null)}
          aria-current={activa === null ? 'page' : undefined}
        >
          <IconoAyuda nombre="inicio" />
          <span>Inicio</span>
        </button>
        {categorias.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            className={`centro-ayuda__nav-boton ${activa === categoria.id ? 'centro-ayuda__nav-boton--activo' : ''}`}
            onClick={() => alElegir(categoria.id)}
            aria-current={activa === categoria.id ? 'page' : undefined}
          >
            <IconoAyuda nombre={categoria.icono} />
            <span>{categoria.etiqueta}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
