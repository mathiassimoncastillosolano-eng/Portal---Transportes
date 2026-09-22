import { iniciales } from '../../utilidades/formato'
import './tarjetaPerfil.css'

export function TarjetaPerfil({ usuario }) {
  return (
    <section className="tarjeta-perfil">
      <div className="tarjeta-perfil__avatar">{iniciales(usuario.nombres, usuario.apellidos)}</div>
      <div className="tarjeta-perfil__datos">
        <h2 className="tarjeta-perfil__nombre">
          {usuario.nombres} {usuario.apellidos}
        </h2>
        <dl className="tarjeta-perfil__lista">
          <div className="tarjeta-perfil__item">
            <dt>Correo</dt>
            <dd>{usuario.correo}</dd>
          </div>
          <div className="tarjeta-perfil__item">
            <dt>Teléfono</dt>
            <dd>{usuario.telefono}</dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
