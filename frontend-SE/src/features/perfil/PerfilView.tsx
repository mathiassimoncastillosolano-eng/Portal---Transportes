import { useEffect, useState, type FormEvent } from 'react'
import { BadgeCheck, Building2, Lock, Mail, Phone, Save, ShieldCheck, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { perfilService } from '@/services/api/perfilService'
import { esApiError } from '@/services/api/httpClient'
import { TODAS_LAS_SEDES, useAuthStore } from '@/stores/authStore'
import { CambiarContrasena } from './CambiarContrasena'
import { useToastStore } from '@/stores/toastStore'

const TELEFONO_VALIDO = /^$|^[0-9+\s-]{6,20}$/
const rolVisible: Record<string, string> = { manager: 'Gerente', staff: 'Personal de agencia', admin: 'Administrador', owner: 'Propietario' }

interface Formulario {
  nombres: string
  apellidos: string
  nroTelefono: string
}

const vacio: Formulario = { nombres: '', apellidos: '', nroTelefono: '' }

/**
 * Sección "Mi perfil" (menú lateral → Cuenta). El empleado revisa y edita sus
 * datos básicos con GET/PUT /api/usuarios/perfil. El correo es su usuario de
 * acceso: se muestra pero no se edita aquí.
 */
export function PerfilView() {
  const user = useAuthStore((s) => s.user)
  const actualizarNombre = useAuthStore((s) => s.actualizarNombre)
  const avisar = useToastStore((s) => s.push)
  const [correo, setCorreo] = useState(user?.email ?? '')
  const [original, setOriginal] = useState<Formulario>(vacio)
  const [formulario, setFormulario] = useState<Formulario>(vacio)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errores, setErrores] = useState<Partial<Record<keyof Formulario, string>>>({})

  useEffect(() => {
    let vigente = true
    perfilService.obtener()
      .then((perfil) => {
        if (!vigente) return
        const datos = { nombres: perfil.nombres, apellidos: perfil.apellidos, nroTelefono: perfil.nroTelefono ?? '' }
        setCorreo(perfil.correo)
        setOriginal(datos)
        setFormulario(datos)
      })
      .catch((error) => vigente && setErrorCarga(esApiError(error) ? error.message : 'No se pudo cargar tu perfil.'))
      .finally(() => vigente && setCargando(false))
    return () => { vigente = false }
  }, [])

  const hayCambios = formulario.nombres !== original.nombres || formulario.apellidos !== original.apellidos || formulario.nroTelefono !== original.nroTelefono

  function validar(datos: Formulario) {
    const nuevos: Partial<Record<keyof Formulario, string>> = {}
    if (!datos.nombres) nuevos.nombres = 'Ingresa tus nombres.'
    if (!datos.apellidos) nuevos.apellidos = 'Ingresa tus apellidos.'
    if (!TELEFONO_VALIDO.test(datos.nroTelefono)) nuevos.nroTelefono = 'Usa solo números, espacios, + o - (6 a 20 caracteres).'
    return nuevos
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    const datos = { nombres: formulario.nombres.trim(), apellidos: formulario.apellidos.trim(), nroTelefono: formulario.nroTelefono.trim() }
    const nuevos = validar(datos)
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return
    setGuardando(true)
    try {
      const perfil = await perfilService.actualizar(datos)
      const guardado = { nombres: perfil.nombres, apellidos: perfil.apellidos, nroTelefono: perfil.nroTelefono ?? '' }
      setOriginal(guardado)
      setFormulario(guardado)
      actualizarNombre(`${perfil.nombres} ${perfil.apellidos}`)
      avisar({ tone: 'success', title: 'Perfil actualizado', description: 'Tus datos se guardaron correctamente.' })
    } catch (error) {
      avisar({ tone: 'danger', title: 'No se pudo guardar', description: esApiError(error) ? error.message : 'Inténtalo de nuevo en unos segundos.' })
    } finally {
      setGuardando(false)
    }
  }

  const cambiar = (campo: keyof Formulario) => (evento: React.ChangeEvent<HTMLInputElement>) =>
    setFormulario((actual) => ({ ...actual, [campo]: evento.target.value }))

  const nombreCompleto = `${formulario.nombres} ${formulario.apellidos}`.trim() || user?.name || ''
  const rol = rolVisible[user?.role ?? ''] ?? user?.role ?? ''
  const sede = user?.agenciaId === TODAS_LAS_SEDES ? 'Todas las sedes' : (user?.agenciaNombre ?? '—')

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-text">Cuenta</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-text-900">Mi perfil</h1>
        <p className="mt-2 text-sm text-text-500">Revisa tus datos, mantén actualizado tu número de contacto y cambia tu contraseña.</p>
      </div>

      {cargando ? (
        <p className="rounded-2xl border border-border bg-surface-card p-8 text-center text-sm text-text-500">Cargando tus datos…</p>
      ) : errorCarga ? (
        <p className="rounded-2xl bg-danger-50 p-5 text-sm text-danger-500">{errorCarga}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="h-fit overflow-hidden rounded-2xl border border-border bg-surface-card shadow-sm">
            <div className="h-20" style={{ backgroundImage: 'linear-gradient(135deg, color-mix(in srgb, var(--canal-web, #16a34a) 45%, transparent), color-mix(in srgb, var(--canal-agencia, #2f6fe0) 35%, transparent))' }} />
            <div className="-mt-10 flex flex-col items-center px-5 pb-6 text-center">
              <div className="rounded-full border-4 border-surface-card"><Avatar name={nombreCompleto} size="lg" /></div>
              <p className="mt-3 font-display text-lg font-bold text-text-900">{nombreCompleto}</p>
              <p className="text-sm text-text-500">{correo}</p>
              <dl className="mt-5 w-full space-y-2 text-left text-sm">
                <div className="flex items-center gap-2.5 rounded-xl bg-surface-sunken px-3 py-2.5"><BadgeCheck size={16} className="shrink-0 text-accent-text" aria-hidden="true" /><dt className="text-text-500">Rol</dt><dd className="ml-auto font-semibold text-text-900">{rol}</dd></div>
                <div className="flex items-center gap-2.5 rounded-xl bg-surface-sunken px-3 py-2.5"><Building2 size={16} className="shrink-0 text-accent-text" aria-hidden="true" /><dt className="text-text-500">Sede</dt><dd className="ml-auto font-semibold text-text-900">{sede}</dd></div>
              </dl>
            </div>
          </aside>

          <div className="space-y-6">
          <form onSubmit={guardar} noValidate className="space-y-6 rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-text-900"><UserRound size={18} aria-hidden="true" />Datos personales</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Nombres" value={formulario.nombres} onChange={cambiar('nombres')} error={errores.nombres} maxLength={100} autoComplete="given-name" />
                <Input label="Apellidos" value={formulario.apellidos} onChange={cambiar('apellidos')} error={errores.apellidos} maxLength={100} autoComplete="family-name" />
              </div>
            </section>

            <section className="space-y-4 border-t border-border pt-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-text-900"><Phone size={18} aria-hidden="true" />Contacto</h2>
              <Input label="Número de celular" type="tel" inputMode="tel" placeholder="Ej. 987 654 321" value={formulario.nroTelefono} onChange={cambiar('nroTelefono')} error={errores.nroTelefono} maxLength={20} autoComplete="tel" />
              <div>
                <p className="mb-1.5 text-sm font-medium text-text-700">Correo</p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-2.5 text-sm text-text-700">
                  <Mail size={16} className="shrink-0 text-text-400" aria-hidden="true" />
                  <span className="truncate">{correo}</span>
                  <Lock size={14} className="ml-auto shrink-0 text-text-400" aria-hidden="true" />
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-text-500"><ShieldCheck size={14} aria-hidden="true" />Es tu usuario para iniciar sesión. Para cambiarlo, pide ayuda al administrador del sistema.</p>
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-5">
              <Button type="button" variant="ghost" disabled={!hayCambios || guardando} onClick={() => { setFormulario(original); setErrores({}) }}>Descartar cambios</Button>
              <Button type="submit" variant="accent" loading={guardando} disabled={!hayCambios} iconLeft={<Save size={16} />}>Guardar cambios</Button>
            </div>
          </form>
          <CambiarContrasena />
          </div>
        </div>
      )}
    </div>
  )
}
