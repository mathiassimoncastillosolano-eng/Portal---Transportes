export function fechaLocal(fecha = new Date()) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

export function fechaDeManana() {
  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  return fechaLocal(manana)
}
