import { useEffect, useState, type FormEvent } from 'react'
import { Lock, Mail, UserRound } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { perfilService } from '@/services/api/perfilService'
import { esApiError } from '@/services/api/httpClient'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { useUIStore } from '@/stores/uiStore'

const TELEFONO_VALIDO = /^$|^[0-9+\s-]{6,20}$/

interface Formulario {
  nombres: string
  apellidos: string
  nroTelefono: string
}

/**
 * "Mi perfil": el empleado revisa y edita sus datos básicos.
 * Usa GET/PUT /api/usuarios/perfil. El correo es el usuario de acceso, por eso
 * se muestra pero no se edita aquí.
 */
export function PerfilModal() {
  const abierto = useUIStore((s) => s.perfilOpen)
  const setAbierto = useUIStore((s) => s.setPerfilOpen)

  return (
    <Modal open={abierto} onClose={() => setAbierto(false)} title="Mi perfil" description="Revisa y actualiza tus datos de contacto.">
      {abierto && <ContenidoPerfil onCerrar={() => setAbierto(false)} />}
    </Modal>
  )
}

function ContenidoPerfil({ onCerrar }: { onCerrar: () => void }) {
  const user = useAuthStore((s) => s.user)
  const actualizarNombre = useAuthStore((s) => s.actualizarNombre)
  const avisar = useToastStore((s) => s.push)
  const [correo, setCorreo] = useState(user?.email ?? '')
  const [formulario, setFormulario] = useState<Formulario>({ nombres: '', apellidos: '', nroTelefono: '' })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [errores, setErrores] = useState<Partial<Record<keyof Formulario, string>>>({})

  useEffect(() => {
    let vigente = true
    perfilService.obtener()
      .then((perfil) => {
        if (!vigente) return
        setCorreo(perfil.correo)
        setFormulario({ nombres: perfil.nombres, apellidos: perfil.apellidos, nroTelefono: perfil.nroTelefono ?? '' })
      })
      .catch((error) => vigente && setErrorCarga(esApiError(error) ? error.message : 'No se pudo cargar tu perfil.'))
      .finally(() => vigente && setCargando(false))
    return () => { vigente = false }
  }, [])

  function validar(datos: Formulario) {
    const nuevos: Partial<Record<keyof Formulario, string>> = {}
    if (!datos.nombres.trim()) nuevos.nombres = 'Ingresa tus nombres.'
    if (!datos.apellidos.trim()) nuevos.apellidos = 'Ingresa tus apellidos.'
    if (!TELEFONO_VALIDO.test(datos.nroTelefono.trim())) nuevos.nroTelefono = 'Usa solo números, espacios, + o - (6 a 20 caracteres).'
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
      actualizarNombre(`${perfil.nombres} ${perfil.apellidos}`)
      avisar({ tone: 'success', title: 'Perfil actualizado', description: 'Tus datos se guardaron correctamente.' })
      onCerrar()
    } catch (error) {
      avisar({ tone: 'danger', title: 'No se pudo guardar', description: esApiError(error) ? error.message : 'Inténtalo de nuevo en unos segundos.' })
    } finally {
      setGuardando(false)
    }
  }

  const cambiar = (campo: keyof Formulario) => (evento: React.ChangeEvent<HTMLInputElement>) =>
    setFormulario((actual) => ({ ...actual, [campo]: evento.target.value }))

  if (cargando) return <p className="py-6 text-center text-sm text-text-500">Cargando tus datos…</p>
  if (errorCarga) return <p className="rounded-xl bg-danger-50 p-4 text-sm text-danger-500">{errorCarga}</p>

  return (
    <form onSubmit={guardar} className="space-y-5" noValidate>
      <div className="flex items-center gap-3 rounded-xl bg-surface-sunken p-3">
        <Avatar name={`${formulario.nombres} ${formulario.apellidos}`} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-900">{formulario.nombres} {formulario.apellidos}</p>
          <p className="truncate text-xs text-text-500">{user?.role === 'manager' ? 'Gerente' : 'Personal de agencia'} · {user?.agenciaNombre ?? 'Todas las sedes'}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombres" value={formulario.nombres} onChange={cambiar('nombres')} error={errores.nombres} maxLength={100} autoComplete="given-name" />
        <Input label="Apellidos" value={formulario.apellidos} onChange={cambiar('apellidos')} error={errores.apellidos} maxLength={100} autoComplete="family-name" />
      </div>

      <Input label="Número de celular" type="tel" inputMode="tel" placeholder="Ej. 987 654 321" value={formulario.nroTelefono} onChange={cambiar('nroTelefono')} error={errores.nroTelefono} maxLength={20} autoComplete="tel" />

      <div>
        <p className="mb-1.5 text-sm font-medium text-text-700">Correo</p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-2.5 text-sm text-text-700">
          <Mail size={16} className="shrink-0 text-text-400" aria-hidden="true" />
          <span className="truncate">{correo}</span>
          <Lock size={14} className="ml-auto shrink-0 text-text-400" aria-hidden="true" />
        </div>
        <p className="mt-1.5 text-xs text-text-500">Es tu usuario para iniciar sesión. Para cambiarlo, pide ayuda al administrador del sistema.</p>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onCerrar}>Cancelar</Button>
        <Button type="submit" variant="accent" loading={guardando} iconLeft={<UserRound size={16} />}>Guardar cambios</Button>
      </div>
    </form>
  )
}
