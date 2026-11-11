import './campoTexto.css'

/** Lista desplegable con el mismo aspecto que CampoTexto. */
export function CampoSeleccion({ etiqueta, valor, alCambiar, opciones, requerido, error }) {
  return (
    <label className="campo-texto">
      <span className="campo-texto__etiqueta">{etiqueta}</span>
      <span className="campo-texto__envoltura">
        <select
          className={`campo-texto__entrada campo-texto__entrada--seleccion ${error ? 'campo-texto__entrada--error' : ''}`}
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
          required={requerido}
        >
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.texto}
            </option>
          ))}
        </select>
        <span className="campo-texto__chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
      {error && <span className="campo-texto__error">{error}</span>}
    </label>
  )
}
