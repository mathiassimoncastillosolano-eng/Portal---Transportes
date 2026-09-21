import { useState } from 'react'
import { CampoTexto } from '../comunes/CampoTexto'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { BotonSecundario } from '../comunes/BotonSecundario'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import './editarPerfilFormulario.css'

/**
 * Formulario de edición del perfil. Solo permite modificar nombres,
 * apellidos y teléfono: el correo no se muestra como editable porque el
 * backend no lo acepta en este endpoint (PUT /api/usuarios/perfil).
 */
export function EditarPerfilFormulario({ usuario, alCancelar, alGuardar }) {
  const { actualizarPerfil } = useAutenticacion()
  const [nombres, setNombres] = useState(usuario.nombres)
  const [apellidos, setApellidos] = useState(usuario.apellidos)
  const [telefono, setTelefono] = useState(usuario.telefono ?? '')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  async function manejarEnvio(evento) {
    evento.preventDefault()
    setError('')
    setCargando(true)
    try {
      await actualizarPerfil({ nombres, apellidos, telefono })
      alGuardar?.()
    } catch (err) {
      setError(err.message ?? 'No se pudo actualizar el perfil.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <form className="editar-perfil" onSubmit={manejarEnvio}>
      <div className="editar-perfil__fila">
        <CampoTexto etiqueta="Nombres" valor={nombres} alCambiar={setNombres} requerido />
        <CampoTexto etiqueta="Apellidos" valor={apellidos} alCambiar={setApellidos} requerido />
      </div>

      <CampoTexto
        etiqueta="Teléfono"
        tipo="tel"
        valor={telefono}
        alCambiar={setTelefono}
        marcador="999999999"
      />

      {error && <p className="editar-perfil__error">{error}</p>}

      <div className="editar-perfil__acciones">
        <BotonSecundario tipo="button" onClick={alCancelar} deshabilitado={cargando}>
          Cancelar
        </BotonSecundario>
        <BotonPrincipal tipo="submit" deshabilitado={cargando}>
          {cargando ? 'Guardando…' : 'Guardar cambios'}
        </BotonPrincipal>
      </div>
    </form>
  )
}
