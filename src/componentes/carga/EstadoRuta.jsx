import { useId } from 'react'
import { Link } from 'react-router-dom'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { BotonSecundario } from '../comunes/BotonSecundario'
import { EscenaEstado } from './EscenasCarga'
import './cargadorRutaLibre.css'

const TEXTOS_POR_DEFECTO = {
  error: {
    titulo: 'No pudimos completar la ruta',
    texto: 'Ocurrió un problema al consultar la información.',
  },
  vacio: {
    titulo: 'Sin resultados',
    texto: 'No encontramos información para mostrar.',
  },
}

/**
 * Estados que NO son carga, con identidad propia (nunca usan el bus en marcha):
 *  · `error`  ruta interrumpida: bus detenido con intermitentes y botón principal.
 *  · `vacio`  sin resultados: bus estacionado en una ruta marcada con ✕.
 *
 * `accion` admite `{ texto, alClick }` o `{ texto, to }` (enlace interno).
 */
export function EstadoRuta({
  tipo = 'vacio',
  titulo,
  texto,
  accion,
  compacto = false,
  entrando = false,
  className = '',
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const esError = tipo === 'error'
  const porDefecto = TEXTOS_POR_DEFECTO[esError ? 'error' : 'vacio']

  const clases = [
    'estado-ruta',
    `estado-ruta--${esError ? 'error' : 'vacio'}`,
    compacto && 'estado-ruta--compacto',
    entrando && 'carga-entrada',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={clases} role={esError ? 'alert' : 'status'}>
      <div className="estado-ruta__escena">
        <EscenaEstado tipo={esError ? 'error' : 'vacio'} uid={uid} />
      </div>

      <h2 className="estado-ruta__titulo">{titulo || porDefecto.titulo}</h2>
      <p className="estado-ruta__texto">{typeof texto === 'string' && texto ? texto : porDefecto.texto}</p>

      {accion && (
        <div className="estado-ruta__accion">
          {accion.to ? (
            <Link className="boton-secundario boton-secundario--contorno" to={accion.to}>
              {accion.texto}
            </Link>
          ) : esError ? (
            <BotonPrincipal onClick={accion.alClick}>{accion.texto}</BotonPrincipal>
          ) : (
            <BotonSecundario onClick={accion.alClick}>{accion.texto}</BotonSecundario>
          )}
        </div>
      )}
    </div>
  )
}
