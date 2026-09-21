import { eliminarToken, guardarToken, obtenerToken, solicitarApi } from './httpCliente'

// Servicio de autenticación real: habla con el backend de Spring Boot
// (login con JWT, perfil del usuario autenticado y cierre de sesión).
//
// Importante: este proyecto NO implementa registro de cuentas. Los
// usuarios se crean manualmente en la base de datos. `registrarUsuario`
// se conserva únicamente para que el formulario de "Crear cuenta" (que ya
// existía en el diseño) siga mostrando un mensaje claro en vez de romperse,
// pero no realiza ninguna petición al backend.

/**
 * Adapta la respuesta del backend (idUsuario, nroTelefono, estadisticas)
 * a la forma que ya usan los componentes existentes del frontend
 * (id, telefono), para no tener que tocar TarjetaPerfil, BarraNavegacion, etc.
 */
function adaptarUsuario(perfil) {
  return {
    id: perfil.idUsuario,
    nombres: perfil.nombres,
    apellidos: perfil.apellidos,
    correo: perfil.correo,
    telefono: perfil.nroTelefono ?? '',
    estadisticas: perfil.estadisticas ?? { pasajes: 0, viajes: 0, tickets: 0 },
  }
}

export async function iniciarSesion(correo, contrasena) {
  const datos = await solicitarApi('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo, contrasena }),
  })

  guardarToken(datos.token)
  // El login solo devuelve los datos mínimos del usuario; se pide el
  // perfil completo (incluye teléfono y estadísticas) inmediatamente
  // después para tener siempre una única fuente de verdad.
  return obtenerUsuarioDeSesion()
}

export async function registrarUsuario() {
  throw new Error(
    'La creación de cuentas todavía no está disponible. Por ahora, solicita tus credenciales al administrador de RutaLibre.'
  )
}

export async function cerrarSesion() {
  try {
    if (obtenerToken()) {
      await solicitarApi('/api/auth/logout', { method: 'POST' })
    }
  } catch {
    // Si la petición de cierre de sesión falla (por ejemplo, el token ya
    // expiró), igual se limpia la sesión localmente: lo importante es que
    // el usuario deje de estar autenticado en el frontend.
  } finally {
    eliminarToken()
  }
}

/**
 * Recupera al usuario de la sesión actual consultando /api/usuarios/perfil
 * con el token guardado. Devuelve null si no hay token o si ya no es válido
 * (por ejemplo, expiró), en cuyo caso también se limpia el token guardado.
 */
export async function obtenerUsuarioDeSesion() {
  const token = obtenerToken()
  if (!token) return null

  try {
    const perfil = await solicitarApi('/api/usuarios/perfil', { method: 'GET' })
    return adaptarUsuario(perfil)
  } catch (error) {
    if (error.status === 401) {
      eliminarToken()
    }
    return null
  }
}

/**
 * Actualiza nombres, apellidos y teléfono del usuario autenticado.
 * El correo y la contraseña no forman parte de esta funcionalidad.
 */
export async function actualizarPerfil({ nombres, apellidos, telefono }) {
  const perfil = await solicitarApi('/api/usuarios/perfil', {
    method: 'PUT',
    body: JSON.stringify({ nombres, apellidos, nroTelefono: telefono }),
  })
  return adaptarUsuario(perfil)
}
