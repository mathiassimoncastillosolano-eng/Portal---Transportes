// Carga de Google Identity Services (GIS), la librería oficial de Google para
// "Continuar con Google". El Client ID es público (no es un secreto); se puede
// sobrescribir con VITE_GOOGLE_CLIENT_ID. NO hay Client Secret en el frontend.

export const GOOGLE_CLIENT_ID =
  import.meta.env?.VITE_GOOGLE_CLIENT_ID ||
  '634394270803-cq7r95msc42438ja1c5rf68v0ma1251i.apps.googleusercontent.com'

const URL_SCRIPT_GOOGLE = 'https://accounts.google.com/gsi/client'

let promesaScript = null

/** Descarga el script de Google una sola vez y devuelve `window.google`. */
export function cargarGoogle() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google no está disponible en este entorno.'))
  }
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  if (promesaScript) return promesaScript

  promesaScript = new Promise((resolver, rechazar) => {
    const script = document.createElement('script')
    script.src = URL_SCRIPT_GOOGLE
    script.async = true
    script.defer = true
    script.onload = () => resolver(window.google)
    script.onerror = () => {
      promesaScript = null // permite reintentar
      script.remove()
      rechazar(new Error('No se pudo cargar Google. Verifica tu conexión e inténtalo de nuevo.'))
    }
    document.head.appendChild(script)
  })
  return promesaScript
}

// GIS se inicializa una sola vez por página; cada botón registra aquí su
// manejador y el callback global lo invoca.
let manejadorCredencial = null
let inicializado = false

export function registrarManejadorCredencial(manejador) {
  manejadorCredencial = manejador
  return () => {
    if (manejadorCredencial === manejador) manejadorCredencial = null
  }
}

export function inicializarGoogle(google) {
  if (inicializado) return
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (respuesta) => manejadorCredencial?.(respuesta),
    // No iniciar sesión automáticamente ni recordar al usuario sin que pulse el botón.
    auto_select: false,
    cancel_on_tap_outside: true,
  })
  inicializado = true
}
