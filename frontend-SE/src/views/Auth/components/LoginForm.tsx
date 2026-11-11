import { useRef, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowRight, BarChart3, Eye, EyeOff, Lock, Mail, Store } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { useAuthStore, type PerfilDemo } from '@/stores/authStore'
import { cn } from '@/utils/cn'
import { useToastStore } from '@/stores/toastStore'

const RECORDAR_KEY = 'rutalibre-se-remember-email'

/**
 * Formulario del login. Toda la lógica de credenciales vive aquí; el panel
 * visual (`LoginBrandPanel`) es puramente decorativo y no la conoce.
 */
export function LoginForm() {
  const login = useAuthStore((s) => s.login)
  const loginDemo = useAuthStore((s) => s.loginDemo)
  const [entrandoDemo, setEntrandoDemo] = useState<PerfilDemo | null>(null)
  const pushToast = useToastStore((s) => s.push)

  const [email, setEmail] = useState(() => window.localStorage.getItem(RECORDAR_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [recordar, setRecordar] = useState(() => !!window.localStorage.getItem(RECORDAR_KEY))
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (enviando) return
    setEnviando(true)
    const resultado = await login(email, password)
    setEnviando(false)

    if (!resultado.ok) {
      setError(resultado.message)
      setPassword('')
      window.requestAnimationFrame(() => passwordRef.current?.focus())
      return
    }

    if (recordar) window.localStorage.setItem(RECORDAR_KEY, email.trim())
    else window.localStorage.removeItem(RECORDAR_KEY)
  }

  async function entrarDemo(perfil: PerfilDemo) {
    if (enviando || entrandoDemo) return
    setError(null)
    setEntrandoDemo(perfil)
    await loginDemo(perfil)
  }

  /** Solo se usa en los `onChange` de los campos: limpia el error cuando la persona vuelve a escribir (no cuando el propio envío resetea el campo). */
  function editar(setter: (v: string) => void) {
    return (valor: string) => {
      setter(valor)
      setError(null)
    }
  }

  function problemasParaAcceder() {
    pushToast({
      tone: 'info',
      title: 'Contacta a tu administrador',
      description: 'Tu administrador de agencia puede restablecer el acceso a tu cuenta.',
    })
  }

  return (
    <div className="w-full max-w-[380px] animate-fade-slide-up">
      <div className="mb-8">
        <h1
          className="text-[26px] font-semibold tracking-tight text-text-900"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Bienvenido de nuevo
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-500">
          Ingresa tus credenciales para acceder al Sistema Empresarial de RutaLibre.
        </p>
      </div>

      <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
        {error && (
          <div
            role="alert"
            className="animate-fade-slide-up-sm flex items-start gap-2.5 rounded-lg border border-danger-500/30 bg-danger-50 px-3.5 py-3 text-sm text-danger-500"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        <Input
          id="login-email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="usuario@rutalibre.com"
          required
          invalid={!!error}
          iconLeft={<Mail className="h-4 w-4" aria-hidden="true" />}
          value={email}
          onChange={(e) => editar(setEmail)(e.target.value)}
        />

        <Input
          id="login-password"
          ref={passwordRef}
          label="Contraseña"
          type={mostrarPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          required
          invalid={!!error}
          iconLeft={<Lock className="h-4 w-4" aria-hidden="true" />}
          trailing={
            <button
              type="button"
              onClick={() => setMostrarPassword((v) => !v)}
              aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={mostrarPassword}
              className="flex h-6 w-6 items-center justify-center rounded text-text-400 transition-colors hover:text-text-700"
            >
              {mostrarPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          }
          value={password}
          onChange={(e) => editar(setPassword)(e.target.value)}
        />

        <div className="flex items-center justify-between pt-1">
          <Checkbox
            label="Recordarme"
            checked={recordar}
            onChange={(e) => setRecordar(e.target.checked)}
          />
          <button
            type="button"
            onClick={problemasParaAcceder}
            className="text-sm font-medium text-route-500 transition-colors hover:text-route-600 dark:hover:text-route-400"
          >
            ¿Problemas para acceder?
          </button>
        </div>

        <Button type="submit" size="lg" loading={enviando} className="mt-1 w-full">
          {enviando ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </Button>
      </form>

      <div className="mt-7">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-500">o entra con una cuenta de demostración</p>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {([
            { perfil: 'gerente', titulo: 'Gerente', detalle: 'Supervisión · Dashboard de todas las sedes', icono: BarChart3 },
            { perfil: 'agencia', titulo: 'Personal de agencia', detalle: 'Operaciones y Comercial · Terminal Lima Norte', icono: Store },
          ] as const).map(({ perfil, titulo, detalle, icono: Icono }) => {
            const cargando = entrandoDemo === perfil
            return (
              <button
                key={perfil}
                type="button"
                onClick={() => entrarDemo(perfil)}
                disabled={enviando || !!entrandoDemo}
                className={cn(
                  'group flex items-center gap-3 rounded-xl border border-border bg-surface-card px-3.5 py-3 text-left',
                  'transition-[border-color,background-color,box-shadow,transform] duration-200 ease-[var(--ease-premium)]',
                  'hover:-translate-y-px hover:border-accent-line hover:bg-surface-hover hover:shadow-panel',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line',
                  'disabled:pointer-events-none disabled:opacity-60',
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-50 text-accent-text transition-colors duration-200 group-hover:bg-accent-100">
                  <Icono className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-semibold text-text-900">{titulo}</span>
                  <span className="mt-0.5 block truncate text-xs text-text-500">{detalle}</span>
                </span>
                {cargando ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-border-strong border-t-accent-line" aria-label="Entrando…" />
                ) : (
                  <ArrowRight className="h-4 w-4 shrink-0 text-text-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-text" aria-hidden="true" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
