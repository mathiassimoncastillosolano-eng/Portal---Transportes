import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { perfilService } from '@/services/api/perfilService'
import { esApiError } from '@/services/api/httpClient'
import { useToastStore } from '@/stores/toastStore'

interface Campos {
  contrasenaActual: string
  contrasenaNueva: string
  confirmacion: string
}

const vacio: Campos = { contrasenaActual: '', contrasenaNueva: '', confirmacion: '' }

/** Puntaje simple de 0 a 4 según largo y variedad de caracteres. */
function fortaleza(clave: string) {
  if (!clave) return { puntos: 0, etiqueta: '', color: 'var(--color-border)' }
  let puntos = 0
  if (clave.length >= 8) puntos++
  if (clave.length >= 12) puntos++
  if (/[a-z]/.test(clave) && /[A-Z]/.test(clave)) puntos++
  if (/\d/.test(clave) && /[^A-Za-z0-9]/.test(clave)) puntos++
  const niveles = [
    { etiqueta: 'Muy débil', color: '#d9544a' },
    { etiqueta: 'Débil', color: '#e08a3c' },
    { etiqueta: 'Aceptable', color: '#f2a516' },
    { etiqueta: 'Buena', color: '#7cb35a' },
    { etiqueta: 'Fuerte', color: '#16a34a' },
  ]
  return { puntos, ...niveles[puntos] }
}

/**
 * Bloque "Seguridad" de Mi perfil: cambia la contraseña pidiendo la actual
 * (PUT /api/usuarios/contrasena).
 */
export function CambiarContrasena() {
  const avisar = useToastStore((s) => s.push)
  const [campos, setCampos] = useState<Campos>(vacio)
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({})
  const [visible, setVisible] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const nivel = fortaleza(campos.contrasenaNueva)
  const completo = campos.contrasenaActual && campos.contrasenaNueva && campos.confirmacion

  const cambiar = (campo: keyof Campos) => (evento: React.ChangeEvent<HTMLInputElement>) => {
    setCampos((actual) => ({ ...actual, [campo]: evento.target.value }))
    setErrores((actual) => ({ ...actual, [campo]: undefined }))
  }

  function validar() {
    const nuevos: Partial<Record<keyof Campos, string>> = {}
    if (!campos.contrasenaActual) nuevos.contrasenaActual = 'Ingresa tu contraseña actual.'
    if (campos.contrasenaNueva.length < 8) nuevos.contrasenaNueva = 'Debe tener al menos 8 caracteres.'
    else if (campos.contrasenaNueva === campos.contrasenaActual) nuevos.contrasenaNueva = 'Debe ser distinta de la actual.'
    if (campos.confirmacion !== campos.contrasenaNueva) nuevos.confirmacion = 'Las contraseñas no coinciden.'
    return nuevos
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    const nuevos = validar()
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return
    setGuardando(true)
    try {
      await perfilService.cambiarContrasena(campos)
      setCampos(vacio)
      avisar({ tone: 'success', title: 'Contraseña actualizada', description: 'La próxima vez inicia sesión con tu nueva contraseña.' })
    } catch (error) {
      const mensaje = esApiError(error) ? error.message : 'No se pudo cambiar la contraseña. Inténtalo de nuevo.'
      if (/actual/i.test(mensaje)) setErrores({ contrasenaActual: mensaje })
      else avisar({ tone: 'danger', title: 'No se pudo cambiar la contraseña', description: mensaje })
    } finally {
      setGuardando(false)
    }
  }

  const tipo = visible ? 'text' : 'password'

  return (
    <form onSubmit={guardar} noValidate className="space-y-4 rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-text-900"><ShieldCheck size={18} aria-hidden="true" />Seguridad</h2>
          <p className="mt-1 text-sm text-text-500">Cambia tu contraseña. Necesitas la actual para confirmar que eres tú.</p>
        </div>
        <button type="button" onClick={() => setVisible(!visible)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-text-500 hover:bg-surface-sunken hover:text-text-900" aria-pressed={visible}>
          {visible ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}{visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      <Input label="Contraseña actual" type={tipo} value={campos.contrasenaActual} onChange={cambiar('contrasenaActual')} error={errores.contrasenaActual} autoComplete="current-password" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Input label="Nueva contraseña" type={tipo} value={campos.contrasenaNueva} onChange={cambiar('contrasenaNueva')} error={errores.contrasenaNueva} autoComplete="new-password" maxLength={72} />
          {campos.contrasenaNueva && (
            <div className="mt-2" aria-live="polite">
              <div className="flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((paso) => <span key={paso} className="h-1.5 flex-1 rounded-full transition-colors" style={{ backgroundColor: paso <= nivel.puntos ? nivel.color : 'var(--color-surface-sunken)' }} />)}
              </div>
              <p className="mt-1 text-xs font-semibold" style={{ color: nivel.color }}>{nivel.etiqueta}</p>
            </div>
          )}
        </div>
        <Input label="Confirmar nueva contraseña" type={tipo} value={campos.confirmacion} onChange={cambiar('confirmacion')} error={errores.confirmacion} autoComplete="new-password" maxLength={72} />
      </div>
      <p className="text-xs text-text-500">Usa al menos 8 caracteres. Combinar mayúsculas, números y símbolos la hace más segura.</p>

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" variant="primary" loading={guardando} disabled={!completo} iconLeft={<KeyRound size={16} />}>Cambiar contraseña</Button>
      </div>
    </form>
  )
}
