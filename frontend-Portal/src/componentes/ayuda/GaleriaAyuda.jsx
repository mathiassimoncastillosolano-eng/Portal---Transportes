import { IconoAyuda } from './IconoAyuda'

export function GaleriaAyuda({ tarjetas, alAbrir }) {
  return (
    <ul className="centro-ayuda__galeria">
      {tarjetas.map((tarjeta) => (
        <li key={tarjeta.id}>
          <button type="button" className="centro-ayuda__galeria-tarjeta" onClick={() => alAbrir(tarjeta.tutorial, tarjeta.escena)}>
            <span className="centro-ayuda__galeria-icono">
              <IconoAyuda nombre={tarjeta.icono} tamano={24} />
            </span>
            <span className="centro-ayuda__galeria-titulo">{tarjeta.titulo}</span>
            <span className="centro-ayuda__galeria-ver">
              <IconoAyuda nombre="reproducir" tamano={14} />
              Ver demostración
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
