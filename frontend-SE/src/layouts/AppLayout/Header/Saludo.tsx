import { useEffect, useState } from 'react'
import { Moon, Sun, Sunset } from 'lucide-react'
import { TODAS_LAS_SEDES, useAuthStore } from '@/stores/authStore'

const rolVisible: Record<string, string> = { manager: 'Gerente', staff: 'Personal de agencia', admin: 'Administrador', owner: 'Propietario' }

/** Saludo según la hora de Perú: mañana (5–11), tarde (12–18) o noche. */
function momentoDelDia(fecha: Date) {
  const hora = Number(new Intl.DateTimeFormat('es-PE', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Lima' }).format(fecha))
  if (hora >= 5 && hora < 12) return { texto: 'Buenos días', Icono: Sun, color: '#f2a516' }
  if (hora >= 12 && hora < 19) return { texto: 'Buenas tardes', Icono: Sunset, color: '#e8572a' }
  return { texto: 'Buenas noches', Icono: Moon, color: '#7c5cd6' }
}

/**
 * Bienvenida del header: saluda al usuario por su nombre y muestra su rol y alcance
 * (reemplaza la etiqueta "Alcance · Todas las sedes").
 */
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
  const alcance = user.agenciaId === TODAS_LAS_SEDES ? 'Todas las sedes' : (user.agenciaNombre ?? 'Sede asignada')

  return (
    <div className="hidden h-10 items-center gap-2.5 rounded-[10px] border border-border bg-surface-sunken pl-1.5 pr-3.5 md:flex" role="status" aria-label={`${texto}, ${primerNombre}. ${rolVisible[user.role] ?? user.role}, ${alcance}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>
        <Icono className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block max-w-[220px] truncate text-[13px] font-semibold text-text-900">{texto}, {primerNombre}</span>
        <span className="block max-w-[220px] truncate text-[11px] text-text-500">Bienvenido · {rolVisible[user.role] ?? user.role} · {alcance}</span>
      </span>
    </div>
  )
}
