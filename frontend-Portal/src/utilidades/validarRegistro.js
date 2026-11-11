// Reglas compartidas por la pagina y el modal. El backend vuelve a validarlas.
export function validarRegistro(valores) {
  const errores = {}
  const nombres = valores.nombres.trim()
  const apellidos = valores.apellidos.trim()
  const correo = valores.correo.trim()
  const telefono = valores.telefono.trim()
  if (!nombres || nombres.length > 100) errores.nombres = 'Ingresa tus nombres (máximo 100 caracteres).'
  if (!apellidos || apellidos.length > 100) errores.apellidos = 'Ingresa tus apellidos (máximo 100 caracteres).'
  if (!/^\S+@\S+\.\S+$/.test(correo) || correo.length > 150) errores.correo = 'Ingresa un correo válido (máximo 150 caracteres).'
  if (telefono.length > 20) errores.telefono = 'El teléfono admite hasta 20 caracteres.'
  if (!valores.contrasena.trim() || valores.contrasena.length < 8) {
    errores.contrasena = 'La contraseña debe tener al menos 8 caracteres.'
  } else if (new TextEncoder().encode(valores.contrasena).length > 72) {
    errores.contrasena = 'La contraseña es demasiado larga; utiliza menos caracteres.'
  }
  if (valores.confirmarContrasena !== valores.contrasena) errores.confirmarContrasena = 'Las contraseñas no coinciden.'
  return errores
}
