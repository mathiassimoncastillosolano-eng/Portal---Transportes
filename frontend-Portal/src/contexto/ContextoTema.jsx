import { createContext, useCallback, useEffect, useMemo, useState } from 'react'

export const CLAVE_TEMA = 'rutalibre:tema'

const ContextoTema = createContext(null)

/**
 * Lee el tema inicial con la misma prioridad que el script anti-parpadeo de
 * index.html: primero la preferencia guardada y, si no hay, la del sistema.
 * Si localStorage no está disponible (modo privado, cookies bloqueadas) se
 * cae con elegancia al tema claro en lugar de romper el arranque.
 */
function leerTemaInicial() {
  if (typeof window === 'undefined') return 'light'
  try {
    const guardado = window.localStorage.getItem(CLAVE_TEMA)
    if (guardado === 'light' || guardado === 'dark') return guardado
  } catch {
    // sin acceso a almacenamiento: seguimos con la preferencia del sistema
  }
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    // matchMedia no disponible
  }
  return 'light'
}

export function ProveedorTema({ children }) {
  const [tema, setTema] = useState(leerTemaInicial)

  // El atributo vive en <html>, así el tema se conserva al navegar entre
  // páginas: React Router no remonta el documento, solo el contenido.
  // Aquí NO se guarda en localStorage a propósito: si se guardara al montar,
  // la primera visita quedaría registrada como "elección del usuario" y la
  // página dejaría de seguir la preferencia del sistema. Solo persiste
  // cuando el usuario cambia el tema explícitamente.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
  }, [tema])

  // Guardar es un efecto secundario, así que se hace aquí y no dentro del
  // actualizador de setState (React puede invocarlo dos veces en desarrollo).
  const establecerTema = useCallback((valor) => {
    if (valor !== 'light' && valor !== 'dark') return
    try {
      window.localStorage.setItem(CLAVE_TEMA, valor)
    } catch {
      // no bloqueante: el tema igual se aplica en esta sesión
    }
    setTema(valor)
  }, [])

  // Si el usuario nunca eligió manualmente, seguimos al sistema en vivo.
  useEffect(() => {
    let consulta
    try {
      consulta = window.matchMedia('(prefers-color-scheme: dark)')
    } catch {
      return undefined
    }
    const alCambiar = (evento) => {
      let hayPreferencia = false
      try {
        hayPreferencia = Boolean(window.localStorage.getItem(CLAVE_TEMA))
      } catch {
        hayPreferencia = false
      }
      if (!hayPreferencia) setTema(evento.matches ? 'dark' : 'light')
    }
    // Safari antiguo usa addListener en lugar de addEventListener.
    if (consulta.addEventListener) consulta.addEventListener('change', alCambiar)
    else if (consulta.addListener) consulta.addListener(alCambiar)
    return () => {
      if (consulta.removeEventListener) consulta.removeEventListener('change', alCambiar)
      else if (consulta.removeListener) consulta.removeListener(alCambiar)
    }
  }, [])

  const alternarTema = useCallback(() => {
    establecerTema(tema === 'dark' ? 'light' : 'dark')
  }, [tema, establecerTema])

  const valor = useMemo(
    () => ({ tema, esOscuro: tema === 'dark', alternarTema, establecerTema }),
    [tema, alternarTema, establecerTema],
  )

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>
}

export default ContextoTema
