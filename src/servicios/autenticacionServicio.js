import { usuarioDemo } from '../datos/usuarios'

// Este "servicio" simula por completo el comportamiento de un backend
// de autenticación utilizando únicamente el almacenamiento del navegador.
// No existe ninguna llamada de red real: queda preparado para que, en el
// futuro, estas mismas funciones invoquen a una API verdadera.

const CLAVE_USUARIOS = 'rutalibre:usuarios'
const CLAVE_SESION = 'rutalibre:sesion'

function retrasoSimulado(ms = 420) {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

function leerUsuarios() {
  const crudo = localStorage.getItem(CLAVE_USUARIOS)
  if (!crudo) {
    const inicial = [usuarioDemo]
    localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(inicial))
    return inicial
  }
  return JSON.parse(crudo)
}

function guardarUsuarios(usuarios) {
  localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios))
}

export async function registrarUsuario(datos) {
  await retrasoSimulado()
  const usuarios = leerUsuarios()

  const yaExiste = usuarios.some(
    (usuario) => usuario.correo.toLowerCase() === datos.correo.toLowerCase()
  )
  if (yaExiste) {
    throw new Error('Ya existe una cuenta registrada con ese correo electrónico.')
  }

  const nuevoUsuario = {
    id: `usuario-${Date.now()}`,
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    correo: datos.correo,
    telefono: datos.telefono,
    contrasena: datos.contrasena,
  }

  guardarUsuarios([...usuarios, nuevoUsuario])
  localStorage.setItem(CLAVE_SESION, nuevoUsuario.id)
  return nuevoUsuario
}

export async function iniciarSesion(correo, contrasena) {
  await retrasoSimulado()
  const usuarios = leerUsuarios()

  const usuario = usuarios.find(
    (candidato) => candidato.correo.toLowerCase() === correo.toLowerCase()
  )

  if (!usuario || usuario.contrasena !== contrasena) {
    throw new Error('Correo o contraseña incorrectos.')
  }

  localStorage.setItem(CLAVE_SESION, usuario.id)
  return usuario
}

export function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION)
}

export function obtenerUsuarioDeSesion() {
  const id = localStorage.getItem(CLAVE_SESION)
  if (!id) return null
  const usuarios = leerUsuarios()
  return usuarios.find((usuario) => usuario.id === id) ?? null
}
