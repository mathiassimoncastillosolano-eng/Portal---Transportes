import { IconoAyuda } from './IconoAyuda'

export function ListaPreguntas({ preguntas, tutoriales, categorias, alAbrir, conCategoria = false }) {
  return (
    <ul className="centro-ayuda__preguntas">
      {preguntas.map((pregunta) => {
        const tutorial = tutoriales.find((item) => item.id === pregunta.tutorial)
        const categoria = categorias.find((item) => item.id === pregunta.categoria)
        return (
          <li key={pregunta.id}>
            <button type="button" className="centro-ayuda__guia-tarjeta centro-ayuda__pregunta-fila" onClick={() => alAbrir(pregunta.tutorial, pregunta.escena)}>
              <span className="centro-ayuda__guia-icono">
                <IconoAyuda nombre={tutorial?.icono} />
              </span>
              <span className="centro-ayuda__guia-cuerpo">
                <span className="centro-ayuda__guia-titulo">{pregunta.pregunta}</span>
                <span className="centro-ayuda__guia-resumen">{pregunta.respuesta}</span>
                {conCategoria && <span className="centro-ayuda__etiqueta">{categoria?.etiqueta}</span>}
              </span>
              <IconoAyuda nombre="reproducir" tamano={18} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
