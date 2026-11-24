import { useEffect } from 'react'
import { IconoAyuda } from '../../componentes/ayuda/IconoAyuda'
import { CATEGORIAS } from '../../datos/ayuda'
import { CONTACTO } from '../../datos/contacto'
import { useAyuda } from '../../hooks/useAyuda'
import './paginaAyuda.css'

export function PaginaAyuda() {
  const { abrirAyuda } = useAyuda()

  useEffect(() => {
    abrirAyuda()
  }, [abrirAyuda])

  return (
    <section className="seccion contenedor pagina-ayuda">
      <div className="pagina-ayuda__cabecera">
        <span className="insignia">Centro de ayuda</span>
        <h1 className="pagina-ayuda__titulo">¿Cómo podemos ayudarte?</h1>
        <p className="pagina-ayuda__texto">
          Guías paso a paso y respuestas a las dudas más frecuentes sobre el uso del portal.
        </p>
        <button type="button" className="pagina-ayuda__boton" onClick={() => abrirAyuda()}>
          <IconoAyuda nombre="ayuda" tamano={18} />
          Abrir el centro de ayuda
        </button>
      </div>

      <ul className="pagina-ayuda__temas">
        {CATEGORIAS.map((categoria) => (
          <li key={categoria.id}>
            <button type="button" className="pagina-ayuda__tema" onClick={() => abrirAyuda({ categoria: categoria.id })}>
              <IconoAyuda nombre={categoria.icono} tamano={18} />
              {categoria.etiqueta}
            </button>
          </li>
        ))}
      </ul>

      <div className="pagina-ayuda__contacto">
        <h2>¿Necesitas hablar con nosotros?</h2>
        <p>Estamos para ayudarte con tu compra o tu viaje.</p>
        <div className="pagina-ayuda__contacto-lista">
          <a className="pagina-ayuda__contacto-item" href={`mailto:${CONTACTO.correo}`}>
            {CONTACTO.correo}
          </a>
          <a className="pagina-ayuda__contacto-item" href={`tel:${CONTACTO.telefono.replace(/\s/g, '')}`}>
            {CONTACTO.telefono}
          </a>
          <span className="pagina-ayuda__contacto-item">{CONTACTO.horarioAtencion}</span>
        </div>
      </div>
    </section>
  )
}
