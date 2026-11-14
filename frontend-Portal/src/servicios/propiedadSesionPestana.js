// Una sesión de reserva (y los asientos que bloquea) debe pertenecer a UNA sola pestaña.
//
// Problema: la sesión se guarda en sessionStorage, y el navegador COPIA ese
// almacenamiento al duplicar una pestaña o abrir un enlace en otra. Dos pestañas
// terminaban con el mismo token: ambas veían "mío" el mismo asiento y una liberaba
// lo que la otra creía tener.
//
// Solución: la pestaña que usa una sesión "la reclama" tomando un candado del
// navegador (Web Locks) con el nombre del token. El candado dura mientras la
// pestaña esté abierta. Si otra pestaña intenta reclamar el mismo token, el
// candado ya está tomado y entonces debe crear su propia sesión.

const PREFIJO_CANDADO = 'rutalibre:sesion-asientos:propietaria:'

// Tokens que ESTA pestaña ya reclamó. Los candados no se pueden tomar dos veces
// desde la misma pestaña, así que se recuerda lo ya reclamado.
const tokensReclamados = new Set()

function navegadorSoportaCandados() {
  return typeof navigator !== 'undefined' && Boolean(navigator.locks)
}

// Devuelve true si esta pestaña es (o pasa a ser) la dueña de la sesión.
export function reclamarSesion(tokenSesion) {
  if (tokensReclamados.has(tokenSesion)) return Promise.resolve(true)
  // Sin soporte de candados no se puede distinguir pestañas: se mantiene el comportamiento anterior.
  if (!navegadorSoportaCandados()) return Promise.resolve(true)

  return new Promise((resolver) => {
    navigator.locks.request(`${PREFIJO_CANDADO}${tokenSesion}`, { ifAvailable: true }, (candado) => {
      if (!candado) {
        resolver(false)
        return undefined
      }
      tokensReclamados.add(tokenSesion)
      resolver(true)
      // Una promesa que nunca termina mantiene el candado hasta que se cierre la pestaña.
      return new Promise(() => {})
    })
  })
}
