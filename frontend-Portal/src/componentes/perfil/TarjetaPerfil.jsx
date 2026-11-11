import { useState } from 'react'
import { iniciales } from '../../utilidades/formato'
import { EditarPerfilFormulario } from './EditarPerfilFormulario'
import './tarjetaPerfil.css'

export function TarjetaPerfil({ usuario }) {
  const [editando, setEditando] = useState(false)

  return (
    <>
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
              <dd>{usuario.telefono || 'No registrado'}</dd>
            </div>
          </dl>
        </div>

        {!editando && (
          <button
            type="button"
            className="tarjeta-perfil__boton-editar"
            onClick={() => setEditando(true)}
          >
            Editar perfil
          </button>
        )}
      </section>

      {editando && (
        <section className="tarjeta-perfil__panel-edicion animar-aparicion">
          <h3 className="tarjeta-perfil__panel-titulo">Editar perfil</h3>
          <p className="tarjeta-perfil__panel-texto">
            Solo puedes actualizar tus nombres, apellidos y teléfono. El correo no se puede modificar desde aquí.
          </p>
          <EditarPerfilFormulario
            usuario={usuario}
            alCancelar={() => setEditando(false)}
            alGuardar={() => setEditando(false)}
          />
        </section>
      )}
    </>
  )
}
