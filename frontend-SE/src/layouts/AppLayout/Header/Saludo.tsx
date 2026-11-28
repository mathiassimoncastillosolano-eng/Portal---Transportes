import { useEffect, useState } from 'react'
import { Moon, Sun, Sunset } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

/** Saludo según la hora de Perú: mañana (5–11), tarde (12–18) o noche. */
function momentoDelDia(fecha: Date) {
  const hora = Number(new Intl.DateTimeFormat('es-PE', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Lima' }).format(fecha))
  if (hora >= 5 && hora < 12) return { texto: 'Buenos días', Icono: Sun, color: '#f2a516' }
  if (hora >= 12 && hora < 19) return { texto: 'Buenas tardes', Icono: Sunset, color: '#e8572a' }
  return { texto: 'Buenas noches', Icono: Moon, color: '#7c5cd6' }
}

/** Bienvenida del header: saluda al usuario por su nombre y muestra la fecha de hoy. */
export function Saludo() {
  const user = useAuthStore((s) => s.user)
  const [ahora, setAhora] = useState(() => new Date())

  // Se actualiza cada 10 minutos para que el saludo cambie si la sesión sigue abierta.
  useEffect(() => {
    const intervalo = window.setInterval(() => setAhora(new Date()), 10 * 60 * 1000)
    return () => window.clearInterval(intervalo)
  }, [])

  if (!user) return null

  const { texto, Icono, color } = momentoDelDia(ahora)
  const primerNombre = user.name.split(' ')[0]
  const fecha = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Lima' }).format(ahora)

  // Texto simple (sin borde ni fondo) para que no parezca un botón o un selector.
  return (
    <p className="flex min-w-0 items-center gap-2.5">
      <Icono className="h-5 w-5 shrink-0" style={{ color }} aria-hidden="true" />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold text-text-900">{texto}, {primerNombre}</span>
        <span className="block truncate text-xs first-letter:uppercase text-text-500">{fecha}</span>
      </span>
    </p>
  )
}
