import { useTema } from '../../hooks/useTema'
import './botonTema.css'

/**
 * Interruptor de tema. Es un botón con aria-pressed en vez de un switch
 * porque solo alterna entre dos estados conocidos y así los lectores de
 * pantalla anuncian el estado actual, no una lista de opciones.
 */
export function BotonTema({ className = '' }) {
  const { esOscuro, alternarTema } = useTema()

  return (
    <button
      type="button"
      className={`boton-tema ${className}`}
      onClick={alternarTema}
      aria-pressed={esOscuro}
      aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={esOscuro ? 'Modo claro' : 'Modo oscuro'}
    >
      <span className="boton-tema__pista" aria-hidden="true">
        <span className="boton-tema__perilla">
          {esOscuro ? (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path
                d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M8 1.4v1.5M8 13.1v1.5M14.6 8h-1.5M2.9 8H1.4M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4 3.3 3.3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
      </span>
    </button>
  )
}
