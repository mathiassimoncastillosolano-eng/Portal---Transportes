import './selectorFecha.css'

export function SelectorFecha({ etiqueta, valor, alCambiar }) {
  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div className="selector-fecha">
      <span className="selector-fecha__etiqueta">{etiqueta}</span>
      <span className="selector-fecha__envoltura">
        <svg className="selector-fecha__icono" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="5.5" width="16" height="15" rx="2.4" stroke="currentColor" strokeWidth="1.7" />
          <path d="M4 9.5h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <input
          type="date"
          className="selector-fecha__control"
          value={valor}
          min={hoy}
          onChange={(evento) => alCambiar(evento.target.value)}
        />
      </span>
    </div>
  )
}
