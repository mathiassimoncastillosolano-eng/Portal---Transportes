import { IconoAyuda } from './IconoAyuda'

export function ListaTutoriales({ tutoriales, alAbrir, estaAutenticado }) {
  return (
    <ul className="centro-ayuda__guias">
      {tutoriales.map((tutorial) => (
        <li key={tutorial.id}>
          <button type="button" className="centro-ayuda__guia-tarjeta" onClick={() => alAbrir(tutorial.id, 0)}>
            <span className="centro-ayuda__guia-icono">
              <IconoAyuda nombre={tutorial.icono} />
            </span>
            <span className="centro-ayuda__guia-cuerpo">
              <span className="centro-ayuda__guia-titulo">{tutorial.titulo}</span>
              <span className="centro-ayuda__guia-resumen">{tutorial.descripcion}</span>
              <span className="centro-ayuda__guia-meta">
                <span>{tutorial.escenas.length} escenas</span>
                {tutorial.accion?.requiereSesion && !estaAutenticado && (
                  <span className="centro-ayuda__etiqueta">
                    <IconoAyuda nombre="candado" tamano={12} />
                    Requiere cuenta
                  </span>
                )}
              </span>
            </span>
            <IconoAyuda nombre="reproducir" tamano={18} />
          </button>
        </li>
      ))}
    </ul>
  )
}
