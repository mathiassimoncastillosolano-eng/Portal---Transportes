import { Link } from 'react-router-dom'
import { CONTACTO } from '../../datos/contacto'
import './documentoLegal.css'

export function DocumentoLegal({ titulo, resumen, children }) {
  return (
    <section className="seccion contenedor documento-legal">
      <header className="documento-legal__cabecera">
        <h1 className="documento-legal__titulo">{titulo}</h1>
        <p className="documento-legal__resumen">{resumen}</p>
        <p className="documento-legal__fecha">Última actualización: {CONTACTO.actualizacionLegal}</p>
        <nav className="documento-legal__enlaces" aria-label="Documentos legales">
          <Link to="/terminos-y-condiciones">Términos y Condiciones</Link>
          <Link to="/politica-cambios-devoluciones">Cambios y Devoluciones</Link>
          <Link to="/libro-reclamaciones">Libro de Reclamaciones</Link>
        </nav>
      </header>
      <div className="documento-legal__cuerpo">{children}</div>
    </section>
  )
}

export function DatosEmpresa() {
  const filas = [
    ['Razón social', CONTACTO.razonSocial],
    ['Nombre comercial', CONTACTO.nombreComercial],
    ['RUC', CONTACTO.ruc],
    ['Correo electrónico', CONTACTO.correo, `mailto:${CONTACTO.correo}`],
    ['Teléfono', CONTACTO.telefono, CONTACTO.telefono && `tel:${CONTACTO.telefono.replace(/\s/g, '')}`],
    ['Dirección', CONTACTO.direccion],
    ['Horario de atención', CONTACTO.horarioAtencion],
  ].filter((fila) => fila[1])

  return (
    <dl className="documento-legal__datos">
      {filas.map(([etiqueta, valor, enlace]) => (
        <div key={etiqueta}>
          <dt>{etiqueta}</dt>
          <dd>{enlace ? <a href={enlace}>{valor}</a> : valor}</dd>
        </div>
      ))}
    </dl>
  )
}
