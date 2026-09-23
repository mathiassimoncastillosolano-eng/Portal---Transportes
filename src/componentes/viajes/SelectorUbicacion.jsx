import { useRef, useState } from 'react'
import { useClicFuera } from '../../hooks/useClicFuera'
import './selectorUbicacion.css'

export function SelectorUbicacion({ etiqueta, valor, alCambiar, excluir, ciudades = [] }) {
  const [abierto, setAbierto] = useState(false)
  const referencia = useRef(null)
  useClicFuera(referencia, () => setAbierto(false))

  const opciones = ciudades.filter((ciudad) => ciudad !== excluir)

  return (
    <div className="selector-ubicacion" ref={referencia}>
      <span className="selector-ubicacion__etiqueta">{etiqueta}</span>
      <button
        type="button"
        aria-label={etiqueta}
        aria-expanded={abierto}
        className="selector-ubicacion__control"
        onClick={() => setAbierto((valorActual) => !valorActual)}
      >
        <svg className="selector-ubicacion__icono" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="12" cy="9.5" r="2.3" stroke="currentColor" strokeWidth="1.7" />
        </svg>
        {valor || 'Selecciona una ciudad'}
      </button>

      {abierto && (
        <ul className="selector-ubicacion__lista animar-aparicion">
          {opciones.map((ciudad) => (
            <li key={ciudad}>
              <button
                type="button"
                className={`selector-ubicacion__opcion ${ciudad === valor ? 'selector-ubicacion__opcion--activa' : ''}`}
                onClick={() => {
                  alCambiar(ciudad)
                  setAbierto(false)
                }}
              >
                {ciudad}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
