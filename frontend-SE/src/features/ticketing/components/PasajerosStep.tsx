import { useRef, useState } from 'react'
import { ArrowLeft, ArrowLeftRight, IdCard, LoaderCircle, Phone, UserRound } from 'lucide-react'
import type { FocusEvent, ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToastStore } from '@/stores/toastStore'
import { fechaHoyLima } from '@/utils/fechas'
import { useTicketWizard } from '../hooks/useTicketWizard'
import type { PasajeroForm } from '../types'
import { consultarDni, type RespuestaDni } from '../utils/consultaDni'
import {
  AVISO_MENORES,
  dniConDatosDistintos,
  esMenorDeEdad,
  fechaMinimaNacimiento,
  pasajeroEstaCompleto,
  validarPasajero,
  type ErroresPasajero,
} from '../utils/validaciones'
import { PassengerTicketCard } from './PassengerTicketCard'
import { StepActions } from './StepActions'

const AVISO_BD = 'Pasajero registrado: sus nombres y apellidos no se pueden modificar. Solo puedes actualizar el celular.'
const AVISO_NO_ENCONTRADO = 'No encontramos este DNI. Completa los datos manualmente.'
const AVISO_ERROR_CONSULTA = 'No se pudo consultar el DNI. Completa los datos manualmente.'

const CAMPOS_COPIABLES = ['dni', 'nombres', 'apellidos', 'fechaNacimiento', 'celular', 'origenDni', 'fechaBloqueada'] as const

const idCampo = (campo: keyof PasajeroForm) => `pasajero-${campo}`

function nombreCompleto(f: PasajeroForm | undefined) {
  return f && (f.nombres || f.apellidos) ? `${f.nombres} ${f.apellidos}`.trim() : ''
}

function SeccionForm({ icono, titulo, descripcion, children }: { icono: ReactNode; titulo: string; descripcion: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-border-subtle bg-surface-sunken/50 p-4">
      <legend className="sr-only">{titulo}</legend>
      <div className="mb-3 flex items-center gap-2.5" aria-hidden="true">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-card text-text-500 shadow-sm">{icono}</span>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold text-text-900">{titulo}</p>
          <p className="text-[11px] text-text-500">{descripcion}</p>
        </div>
      </div>
      {children}
    </fieldset>
  )
}

export function PasajerosStep() {
  const {
    viaje,
    sesion,
    asientos,
    asientoActivo,
    pasajerosPorAsiento,
    cantidadPasajes,
    cantidadCompletados,
    setAsientoActivo,
    setDatosPasajero,
    irA,
  } = useTicketWizard()
  const pushToast = useToastStore((s) => s.push)
  const [errores, setErrores] = useState<ErroresPasajero>({})
  const [consultando, setConsultando] = useState<Record<number, boolean>>({})
  const [avisos, setAvisos] = useState<Record<number, string>>({})
  const vigentes = useRef<Record<number, string>>({})
  const consultas = useRef(new Map<string, Promise<RespuestaDni>>())

  if (!viaje || asientos.length === 0) return null

  const activo = asientoActivo ?? asientos[0].idAsiento
  const asientoElegido = asientos.find((a) => a.idAsiento === activo) ?? asientos[0]
  const idAsiento = asientoElegido.idAsiento
  const form = pasajerosPorAsiento[idAsiento]

  if (!form) return null

  const erroresDni = dniConDatosDistintos(asientos.map((a) => ({ idAsiento: a.idAsiento, form: pasajerosPorAsiento[a.idAsiento] })))
  const estaListo = (id: number) => pasajeroEstaCompleto(pasajerosPorAsiento[id]) && !erroresDni[id]
  const pendientes = asientos.filter((a) => !estaListo(a.idAsiento)).length
  const todosListos = pendientes === 0
  const bloqueadoPorBd = form.origenDni === 'BD'
  const consultandoActivo = !!consultando[idAsiento]
  const avisoDni = bloqueadoPorBd ? AVISO_BD : (avisos[idAsiento] ?? '')
  const origenesCopia = asientos.filter((a) => a.idAsiento !== idAsiento && /^\d{8}$/.test(pasajerosPorAsiento[a.idAsiento]?.dni ?? ''))

  function cambiarActivo(id: number) {
    setAsientoActivo(id)
    setErrores({})
  }

  function actualizar(parcial: Partial<PasajeroForm>) {
    setDatosPasajero(idAsiento, parcial)
    setErrores((prev) => {
      const siguiente = { ...prev }
      Object.keys(parcial).forEach((campo) => delete siguiente[campo as keyof PasajeroForm])
      return siguiente
    })
  }

  function validarCampo(e: FocusEvent<HTMLFormElement>) {
    const campo = e.target.id.replace('pasajero-', '') as keyof PasajeroForm
    if (!form || !CAMPOS_COPIABLES.includes(campo as (typeof CAMPOS_COPIABLES)[number]) || form[campo] === '') return
    setErrores((prev) => ({ ...prev, [campo]: validarPasajero(form)[campo] }))
  }

  function consultaCompartida(dni: string) {
    const existente = consultas.current.get(dni)
    if (existente) return existente
    const nueva = consultarDni(dni)
    consultas.current.set(dni, nueva)
    nueva.catch(() => consultas.current.delete(dni))
    return nueva
  }

  async function buscarDni(id: number, dni: string) {
    setConsultando((prev) => ({ ...prev, [id]: true }))
    try {
      const respuesta = await consultaCompartida(dni)
      if (vigentes.current[id] !== dni) return
      if (respuesta.existente) {
        const celular = (respuesta.nroTelefono ?? '').replace(/\D/g, '').slice(-9)
        setDatosPasajero(id, {
          nombres: respuesta.nombres ?? '',
          apellidos: respuesta.apellidos ?? '',
          fechaNacimiento: respuesta.fechaNacimiento ?? '',
          fechaBloqueada: Boolean(respuesta.fechaNacimiento),
          celular: /^9\d{8}$/.test(celular) ? celular : '',
          origenDni: 'BD',
        })
        setAvisos((prev) => ({ ...prev, [id]: '' }))
      } else if (respuesta.origen === 'APIPERU') {
        setDatosPasajero(id, { nombres: respuesta.nombres ?? '', apellidos: respuesta.apellidos ?? '', origenDni: 'APIPERU' })
        setAvisos((prev) => ({ ...prev, [id]: '' }))
      } else {
        setDatosPasajero(id, { origenDni: 'MANUAL' })
        setAvisos((prev) => ({ ...prev, [id]: AVISO_NO_ENCONTRADO }))
      }
    } catch {
      if (vigentes.current[id] !== dni) return
      setDatosPasajero(id, { origenDni: 'MANUAL' })
      setAvisos((prev) => ({ ...prev, [id]: AVISO_ERROR_CONSULTA }))
    } finally {
      if (vigentes.current[id] === dni) setConsultando((prev) => ({ ...prev, [id]: false }))
    }
  }

  function manejarDni(valor: string) {
    const dni = valor.replace(/\D/g, '').slice(0, 8)
    if (dni === form.dni) return
    vigentes.current[idAsiento] = dni
    setConsultando((prev) => ({ ...prev, [idAsiento]: false }))
    setAvisos((prev) => ({ ...prev, [idAsiento]: '' }))
    const vienedeConsulta = form.origenDni === 'BD' || form.origenDni === 'APIPERU'
    actualizar({
      dni,
      ...(vienedeConsulta
        ? {
            nombres: '',
            apellidos: '',
            origenDni: '' as const,
            ...(form.origenDni === 'BD' ? { fechaNacimiento: '', celular: '', fechaBloqueada: false } : {}),
          }
        : {}),
    })
    if (dni.length === 8) void buscarDni(idAsiento, dni)
  }

  function copiarDatos(idOrigen: number) {
    const origen = pasajerosPorAsiento[idOrigen]
    if (!origen) return
    const copia = Object.fromEntries(CAMPOS_COPIABLES.map((campo) => [campo, origen[campo]])) as Partial<PasajeroForm>
    vigentes.current[idAsiento] = origen.dni
    actualizar(copia)
    setAvisos((prev) => ({ ...prev, [idAsiento]: '' }))
  }

  function continuar() {
    const pendiente = asientos.find((a) => !estaListo(a.idAsiento))
    if (pendiente) {
      setAsientoActivo(pendiente.idAsiento)
      setErrores({ ...validarPasajero(pasajerosPorAsiento[pendiente.idAsiento]), ...erroresDni[pendiente.idAsiento] })
      return
    }
    if (!sesion || asientos.some((a) => !pasajerosPorAsiento[a.idAsiento])) {
      pushToast({ tone: 'danger', title: 'No se puede continuar', description: 'Revisa que cada asiento tenga su pasajero asociado.' })
      return
    }
    if (Object.values(consultando).some(Boolean)) {
      pushToast({ tone: 'info', title: 'Espera un momento', description: 'Aún se están consultando los datos de un DNI.' })
      return
    }
    irA('pago')
  }

  return (
    <div className="min-w-0">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-700">
            Pasajeros ·{' '}
            <span className={cantidadCompletados === cantidadPasajes ? 'text-accent-text' : 'text-text-500'}>
              {cantidadCompletados} de {cantidadPasajes} completados
            </span>
          </p>
          <p className="mt-0.5 text-xs text-text-500">Haz clic en un pasaje para completar sus datos.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => irA('asientos')}
          iconLeft={<ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Cambiar asientos
        </Button>
      </div>

      <div className="-mx-1 mb-6 flex min-w-0 gap-3 overflow-x-auto px-1 pb-2 pt-2" role="tablist" aria-label="Pasajeros del registro">
        {asientos.map((a, i) => (
          <PassengerTicketCard
            key={a.idAsiento}
            indice={i + 1}
            codigoAsiento={a.numero}
            nombreCompleto={nombreCompleto(pasajerosPorAsiento[a.idAsiento])}
            completo={estaListo(a.idAsiento)}
            activo={a.idAsiento === activo}
            onClick={() => cambiarActivo(a.idAsiento)}
          />
        ))}
      </div>

      <form noValidate onSubmit={(e) => e.preventDefault()} onBlur={validarCampo}>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 items-center rounded-md bg-accent-line/12 px-2 text-xs font-semibold tabular-nums text-accent-text">
            Asiento {asientoElegido.numero}
          </span>
          <p className="text-sm font-semibold text-text-900">Datos del pasajero</p>
        </div>

        {origenesCopia.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-text-500" role="group" aria-label="Reutilizar datos de otro asiento">
            <span>¿Viaja la misma persona? Usar los datos del asiento:</span>
            {origenesCopia.map((a) => (
              <button
                key={a.idAsiento}
                type="button"
                onClick={() => copiarDatos(a.idAsiento)}
                className="rounded-full border border-border-strong bg-surface-card px-2.5 py-1 font-semibold tabular-nums text-text-700 transition-colors hover:border-accent-line hover:bg-accent-50 hover:text-accent-text"
              >
                {a.numero}
                {pasajerosPorAsiento[a.idAsiento]?.nombres.trim() ? ` · ${pasajerosPorAsiento[a.idAsiento].nombres.trim().split(' ')[0]}` : ''}
              </button>
            ))}
          </div>
        )}

        <div key={activo} className="animate-step-swap flex flex-col gap-3">
          <SeccionForm icono={<IdCard className="h-4 w-4" />} titulo="Identificación" descripcion="Al completar el DNI se buscan sus datos">
            <Input
              id={idCampo('dni')}
              label="DNI"
              required
              autoComplete="off"
              inputMode="numeric"
              maxLength={8}
              placeholder="8 dígitos"
              hint={consultandoActivo ? 'Buscando datos del DNI…' : undefined}
              value={form.dni}
              error={errores.dni ?? erroresDni[idAsiento]?.dni}
              trailing={consultandoActivo ? <LoaderCircle className="h-4 w-4 animate-spin text-text-400" aria-hidden="true" /> : undefined}
              containerClassName="sm:max-w-[calc(50%-0.5rem)]"
              onChange={(e) => manejarDni(e.target.value)}
            />
            {avisoDni && (
              <p className="mt-3 rounded-lg border border-border bg-surface-card px-3 py-2 text-xs text-text-700" role="status">
                {avisoDni}
              </p>
            )}
          </SeccionForm>

          <SeccionForm icono={<UserRound className="h-4 w-4" />} titulo="Datos personales" descripcion="Tal como figura en el documento">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id={idCampo('nombres')}
                label="Nombres"
                required
                autoComplete="off"
                placeholder="Ej. María Fernanda"
                disabled={bloqueadoPorBd}
                value={form.nombres}
                error={errores.nombres}
                onChange={(e) => actualizar({ nombres: e.target.value })}
              />
              <Input
                id={idCampo('apellidos')}
                label="Apellidos"
                required
                autoComplete="off"
                placeholder="Ej. Torres Quispe"
                disabled={bloqueadoPorBd}
                value={form.apellidos}
                error={errores.apellidos}
                onChange={(e) => actualizar({ apellidos: e.target.value })}
              />
              <Input
                id={idCampo('fechaNacimiento')}
                label="Fecha de nacimiento"
                required
                type="date"
                min={fechaMinimaNacimiento()}
                max={fechaHoyLima()}
                disabled={bloqueadoPorBd && form.fechaBloqueada}
                value={form.fechaNacimiento}
                error={errores.fechaNacimiento}
                onChange={(e) => actualizar({ fechaNacimiento: e.target.value })}
              />
            </div>
            {esMenorDeEdad(form.fechaNacimiento) && (
              <p className="mt-3 rounded-lg border border-border bg-surface-card px-3 py-2 text-xs text-text-700" role="status">
                {AVISO_MENORES.join(' ')}
              </p>
            )}
          </SeccionForm>

          <SeccionForm icono={<Phone className="h-4 w-4" />} titulo="Datos de contacto" descripcion="Para avisos del viaje">
            <Input
              id={idCampo('celular')}
              label="Celular"
              required
              type="tel"
              inputMode="numeric"
              maxLength={9}
              autoComplete="off"
              placeholder="9XXXXXXXX"
              value={form.celular}
              error={errores.celular}
              containerClassName="sm:max-w-[calc(50%-0.5rem)]"
              onChange={(e) => actualizar({ celular: e.target.value.replace(/\D/g, '').slice(0, 9) })}
            />
          </SeccionForm>
        </div>
      </form>

      {todosListos ? (
        <div className="animate-fade-slide-up-sm">
          <StepActions
            onBack={() => irA('asientos')}
            onContinue={continuar}
            continueLabel={cantidadPasajes > 1 ? `Continuar al pago · ${cantidadPasajes} pasajes` : 'Continuar al pago'}
          />
        </div>
      ) : (
        <div className="mt-6 flex flex-col-reverse items-stretch gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={() => irA('asientos')} iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
            Atrás
          </Button>
          <p className="text-xs text-text-500" aria-live="polite">
            Completa {pendientes === 1 ? 'el pasaje pendiente' : `los ${pendientes} pasajes pendientes`} para continuar al pago.
          </p>
        </div>
      )}
    </div>
  )
}
