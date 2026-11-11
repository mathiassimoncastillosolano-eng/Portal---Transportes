import { useId } from 'react'
import {
  ADVERTENCIA_PRODUCCION,
  AVISO_SANDBOX,
  ENTORNO_PRODUCCION,
  ENTORNO_SANDBOX,
} from '../../utilidades/entornoPago'
import './selectorEntornoPago.css'

const OPCIONES = [
  {
    codigo: ENTORNO_PRODUCCION,
    titulo: 'Pago real',
    detalle: 'Producción · se cobra dinero real',
  },
  {
    codigo: ENTORNO_SANDBOX,
    titulo: 'Pago de prueba',
    detalle: 'Sandbox · sin cobros reales',
  },
]

/**
 * Selector de entorno de pago (Producción / Sandbox). Solo se muestra a usuarios que el backend autorizó a usar
 * Sandbox; para el resto de compradores el pago es siempre real y no aparece.
 *
 * `entornos` viene de GET /api/pagos/configuracion: lista de { codigo, disponible }. Elegir aquí solo SOLICITA el
 * entorno; el backend lo vuelve a validar al cobrar.
 */
export function SelectorEntornoPago({ entornos, valor, alCambiar, bloqueado }) {
  const nombre = useId()
  const disponibles = new Map(entornos.map((e) => [e.codigo, e.disponible]))

  return (
    <section className="selector-entorno" aria-label="Entorno de pago">
      <div className="selector-entorno__opciones" role="radiogroup" aria-label="Entorno de pago">
        {OPCIONES.filter((opcion) => disponibles.has(opcion.codigo)).map((opcion) => {
          const activo = valor === opcion.codigo
          const habilitado = disponibles.get(opcion.codigo) === true
          return (
            <label
              key={opcion.codigo}
              className={[
                'selector-entorno__opcion',
                `selector-entorno__opcion--${opcion.codigo === ENTORNO_SANDBOX ? 'prueba' : 'real'}`,
                activo ? 'selector-entorno__opcion--activa' : '',
                !habilitado || bloqueado ? 'selector-entorno__opcion--inactiva' : '',
              ].join(' ')}
            >
              <input
                type="radio"
                name={nombre}
                value={opcion.codigo}
                checked={activo}
                disabled={!habilitado || bloqueado}
                onChange={() => alCambiar(opcion.codigo)}
              />
              <span className="selector-entorno__icono" aria-hidden="true">
                {opcion.codigo === ENTORNO_SANDBOX ? (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path d="M7.5 2.5h5M8.5 2.5v5.2L4 15.2a1.6 1.6 0 0 0 1.4 2.3h9.2a1.6 1.6 0 0 0 1.4-2.3l-4.5-7.5V2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2 16.5 4.5v4.8c0 4-2.7 6.8-6.5 8.2-3.8-1.4-6.5-4.2-6.5-8.2V4.5L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="m7.2 10 2 2 3.6-3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="selector-entorno__texto">
                <strong>{opcion.titulo}</strong>
                <small>{habilitado ? opcion.detalle : 'No disponible: falta configurar'}</small>
              </span>
            </label>
          )
        })}
      </div>

      {valor === ENTORNO_PRODUCCION && (
        <p className="selector-entorno__aviso selector-entorno__aviso--real" role="alert">
          {ADVERTENCIA_PRODUCCION}
        </p>
      )}
      {valor === ENTORNO_SANDBOX && (
        <p className="selector-entorno__aviso selector-entorno__aviso--prueba" role="status">
          <span className="selector-entorno__etiqueta">SANDBOX</span> {AVISO_SANDBOX}
        </p>
      )}
    </section>
  )
}
