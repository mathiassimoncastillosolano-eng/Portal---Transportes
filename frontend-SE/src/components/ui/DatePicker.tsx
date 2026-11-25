import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { sumarDias } from '@/utils/fechas'
import { formatearFechaLarga } from '@/utils/formato'

interface DatePickerProps {
  value: string
  onChange: (iso: string) => void
  min?: string
  max?: string
  label?: string
  id?: string
  error?: string
  required?: boolean
  disabled?: boolean
  nacimiento?: boolean
  className?: string
  labelClassName?: string
  containerClassName?: string
}

interface Posicion {
  left: number
  top?: number
  bottom?: number
}

type Modo = 'dias' | 'meses' | 'anios'

const ANCHO_PANEL = 296
const ALTO_PANEL = 360
const SEPARACION = 6
const MARGEN = 8
const ANIOS_POR_PAGINA = 12
const ANTIGUEDAD_INICIAL = 30
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const dos = (n: number) => String(n).padStart(2, '0')
const aIso = (y: number, m: number, d: number) => `${y}-${dos(m + 1)}-${dos(d)}`
const partes = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: m - 1, d }
}
const ultimoDia = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

function nombreMes(y: number, m: number) {
  const texto = new Date(Date.UTC(y, m, 1)).toLocaleDateString('es-PE', { month: 'long', timeZone: 'UTC' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function titulo(y: number, m: number) {
  return `${nombreMes(y, m)} ${y}`
}

function fechaNacimientoLarga(iso: string) {
  const { y, m, d } = partes(iso)
  return new Date(Date.UTC(y, m, d)).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function celdasDelMes(y: number, m: number): (string | null)[] {
  const desfase = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7
  const celdas: (string | null)[] = Array.from({ length: desfase }, () => null)
  for (let d = 1; d <= ultimoDia(y, m); d++) celdas.push(aIso(y, m, d))
  while (celdas.length % 7 !== 0) celdas.push(null)
  return celdas
}

function calcularPosicion(disparador: HTMLElement): Posicion {
  const r = disparador.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = Math.min(Math.max(r.left, MARGEN), vw - MARGEN - ANCHO_PANEL)
  const abajo = vh - r.bottom - SEPARACION - MARGEN
  const arriba = r.top - SEPARACION - MARGEN
  return abajo >= ALTO_PANEL || abajo >= arriba
    ? { left, top: r.bottom + SEPARACION }
    : { left, bottom: vh - r.top + SEPARACION }
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  label,
  id,
  error,
  required,
  disabled,
  nacimiento,
  className,
  labelClassName,
  containerClassName,
}: DatePickerProps) {
  const generado = useId()
  const triggerId = id ?? `${generado}-fecha`
  const labelId = `${generado}-etiqueta`
  const panelId = `${generado}-panel`

  const anioMin = min ? Number(min.slice(0, 4)) : 1900
  const anioMax = max ? Number(max.slice(0, 4)) : new Date().getUTCFullYear() + 5

  const fechaInicial = useCallback(() => {
    if (value) return value
    if (nacimiento) return aIso(Math.max(anioMin, anioMax - ANTIGUEDAD_INICIAL), 0, 1)
    if (min) return min
    return aIso(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)
  }, [value, nacimiento, anioMin, anioMax, min])

  const [abierto, setAbierto] = useState(false)
  const [posicion, setPosicion] = useState<Posicion | null>(null)
  const [modo, setModo] = useState<Modo>('dias')
  const [paginaAnio, setPaginaAnio] = useState(anioMin)
  const inicial = partes(fechaInicial())
  const [vista, setVista] = useState({ y: inicial.y, m: inicial.m })
  const [foco, setFoco] = useState(value)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const enfocarDia = useRef(false)

  const celdas = useMemo(() => celdasDelMes(vista.y, vista.m), [vista])
  const hoy = min

  const deshabilitada = useCallback((iso: string) => (!!min && iso < min) || (!!max && iso > max), [min, max])

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false)
    if (devolverFoco) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  const abrir = useCallback(() => {
    const base = fechaInicial()
    const p = partes(base)
    setVista({ y: p.y, m: p.m })
    setFoco(base)
    setModo('dias')
    enfocarDia.current = true
    setAbierto(true)
  }, [fechaInicial])

  useLayoutEffect(() => {
    if (!abierto || !triggerRef.current) return
    setPosicion(calcularPosicion(triggerRef.current))
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    function alPulsar(e: PointerEvent) {
      const objetivo = e.target as Node
      if (panelRef.current?.contains(objetivo) || triggerRef.current?.contains(objetivo)) return
      cerrar(false)
    }
    function alTeclear(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') cerrar(true)
    }
    function alMover() {
      cerrar(false)
    }
    document.addEventListener('pointerdown', alPulsar)
    document.addEventListener('keydown', alTeclear)
    window.addEventListener('resize', alMover)
    window.addEventListener('scroll', alMover, true)
    return () => {
      document.removeEventListener('pointerdown', alPulsar)
      document.removeEventListener('keydown', alTeclear)
      window.removeEventListener('resize', alMover)
      window.removeEventListener('scroll', alMover, true)
    }
  }, [abierto, cerrar])

  useEffect(() => {
    if (!abierto || !posicion || !enfocarDia.current || modo !== 'dias') return
    enfocarDia.current = false
    panelRef.current?.querySelector<HTMLButtonElement>('button[data-dia][tabindex="0"]')?.focus({ preventScroll: true })
  }, [abierto, posicion, foco, modo])

  function moverMes(delta: number) {
    setVista((v) => {
      const total = v.y * 12 + v.m + delta
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 }
    })
  }

  function mover(delta: number) {
    if (modo === 'anios') setPaginaAnio((p) => p + delta * ANIOS_POR_PAGINA)
    else if (modo === 'meses') setVista((v) => ({ ...v, y: v.y + delta }))
    else moverMes(delta)
  }

  function abrirAnios() {
    setPaginaAnio(anioMin + Math.floor((vista.y - anioMin) / ANIOS_POR_PAGINA) * ANIOS_POR_PAGINA)
    setModo('anios')
  }

  function elegirAnio(y: number) {
    setVista((v) => ({ ...v, y }))
    setModo('meses')
  }

  function elegirMes(m: number) {
    setVista((v) => ({ ...v, m }))
    setFoco('')
    setModo('dias')
  }

  function elegir(iso: string) {
    if (deshabilitada(iso)) return
    onChange(iso)
    cerrar(true)
  }

  function moverFoco(destino: string) {
    if (deshabilitada(destino)) return
    const p = partes(destino)
    setVista({ y: p.y, m: p.m })
    setFoco(destino)
    enfocarDia.current = true
  }

  function alTeclearDia(e: KeyboardEvent<HTMLDivElement>) {
    const base = foco || value || min
    if (!base) return
    const pasos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (e.key in pasos) {
      e.preventDefault()
      moverFoco(sumarDias(base, pasos[e.key]))
    } else if (e.key === 'Home') {
      e.preventDefault()
      moverFoco(aIso(vista.y, vista.m, 1))
    } else if (e.key === 'End') {
      e.preventDefault()
      moverFoco(aIso(vista.y, vista.m, ultimoDia(vista.y, vista.m)))
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault()
      const p = partes(base)
      const total = p.y * 12 + p.m + (e.key === 'PageUp' ? -1 : 1)
      const y = Math.floor(total / 12)
      const m = ((total % 12) + 12) % 12
      moverFoco(aIso(y, m, Math.min(p.d, ultimoDia(y, m))))
    }
  }

  const diaFocoVisible = celdas.includes(foco) ? foco : celdas.find((c) => c && !deshabilitada(c)) ?? null
  const siguiente = vista.m === 11 ? { y: vista.y + 1, m: 0 } : { y: vista.y, m: vista.m + 1 }

  function puedeIr(delta: number) {
    if (modo === 'anios') return delta < 0 ? paginaAnio > anioMin : paginaAnio + ANIOS_POR_PAGINA <= anioMax
    if (modo === 'meses') return vista.y + delta >= anioMin && vista.y + delta <= anioMax
    if (delta < 0) return !min || aIso(vista.y, vista.m, 1) > min.slice(0, 8) + '01'
    return !max || aIso(siguiente.y, siguiente.m, 1) <= max
  }

  const mesDeshabilitado = (m: number) =>
    (!!min && aIso(vista.y, m, ultimoDia(vista.y, m)) < min) || (!!max && aIso(vista.y, m, 1) > max)

  const botonNavegar = 'flex h-8 w-8 items-center justify-center rounded-lg text-text-500 transition-colors hover:bg-surface-hover hover:text-text-900 disabled:pointer-events-none disabled:opacity-30'
  const botonCabecera = 'flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-text-900 transition-colors hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-line'
  const celdaSeleccion = 'flex h-10 items-center justify-center rounded-lg text-sm tabular-nums transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-line'

  const textoDisparador = value ? (nacimiento ? fechaNacimientoLarga(value) : formatearFechaLarga(value)) : nacimiento ? 'Seleccionar fecha' : 'Elegir fecha'

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', containerClassName)}>
      {label && (
        <span id={labelId} className={cn('text-xs font-medium text-text-700', nacimiento && 'text-sm', labelClassName)}>
          {label}
          {required && <span className="ml-0.5 text-danger-500">*</span>}
        </span>
      )}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? panelId : undefined}
        aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
        aria-invalid={!!error}
        onClick={() => (abierto ? cerrar(false) : abrir())}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-surface-card px-3 text-left text-sm font-medium text-text-900',
          'transition-[border-color,box-shadow] duration-200 hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line',
          'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-400 disabled:hover:border-border',
          nacimiento && 'h-9 border-border-strong font-normal',
          nacimiento && abierto && 'border-accent-400 ring-2 ring-accent-100',
          nacimiento && !value && 'text-text-400',
          error && 'border-danger-500',
          className,
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
        <span className={cn('flex-1 truncate', !nacimiento && 'capitalize')}>{textoDisparador}</span>
        {nacimiento && (
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-text-400 transition-transform duration-200', abierto && 'rotate-180')}
            aria-hidden="true"
          />
        )}
      </button>

      {abierto &&
        posicion &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={nacimiento ? 'Elegir fecha de nacimiento' : 'Elegir fecha'}
            style={{ position: 'fixed', left: posicion.left, top: posicion.top, bottom: posicion.bottom, width: ANCHO_PANEL }}
            className="animate-fade-slide-up-sm z-[80] rounded-2xl border border-border bg-surface-card p-3 shadow-flyout"
          >
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => mover(-1)} disabled={!puedeIr(-1)} aria-label="Anterior" className={botonNavegar}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              {nacimiento ? (
                <div className="flex items-center gap-1" aria-live="polite">
                  {modo === 'dias' && (
                    <button type="button" onClick={() => setModo('meses')} className={botonCabecera} aria-label="Elegir mes">
                      {nombreMes(vista.y, vista.m)}
                      <ChevronDown className="h-3.5 w-3.5 text-text-400" aria-hidden="true" />
                    </button>
                  )}
                  {modo === 'anios' ? (
                    <p className="px-2 py-1 text-sm font-semibold tabular-nums text-text-900">
                      {paginaAnio} – {Math.min(paginaAnio + ANIOS_POR_PAGINA - 1, anioMax)}
                    </p>
                  ) : (
                    <button type="button" onClick={abrirAnios} className={botonCabecera} aria-label="Elegir año">
                      <span className="tabular-nums">{vista.y}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-text-400" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm font-semibold text-text-900" aria-live="polite">
                  {titulo(vista.y, vista.m)}
                </p>
              )}
              <button type="button" onClick={() => mover(1)} disabled={!puedeIr(1)} aria-label="Siguiente" className={botonNavegar}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {modo === 'anios' && (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {Array.from({ length: ANIOS_POR_PAGINA }, (_, i) => paginaAnio + i).map((y) => {
                  const bloqueado = y < anioMin || y > anioMax
                  const actual = y === vista.y
                  return (
                    <button
                      key={y}
                      type="button"
                      disabled={bloqueado}
                      aria-current={actual ? 'true' : undefined}
                      onClick={() => elegirAnio(y)}
                      className={cn(
                        celdaSeleccion,
                        bloqueado && 'cursor-not-allowed text-text-400 opacity-30',
                        !bloqueado && !actual && 'text-text-900 hover:bg-surface-hover',
                        actual && 'bg-cta font-semibold text-on-cta',
                      )}
                    >
                      {y}
                    </button>
                  )
                })}
              </div>
            )}

            {modo === 'meses' && (
              <div className="grid grid-cols-3 gap-1.5 py-1">
                {MESES.map((nombre, m) => {
                  const bloqueado = mesDeshabilitado(m)
                  const actual = m === vista.m
                  return (
                    <button
                      key={nombre}
                      type="button"
                      disabled={bloqueado}
                      aria-current={actual ? 'true' : undefined}
                      onClick={() => elegirMes(m)}
                      className={cn(
                        celdaSeleccion,
                        bloqueado && 'cursor-not-allowed text-text-400 opacity-30',
                        !bloqueado && !actual && 'text-text-900 hover:bg-surface-hover',
                        actual && 'bg-cta font-semibold text-on-cta',
                      )}
                    >
                      {nombre}
                    </button>
                  )
                })}
              </div>
            )}

            {modo === 'dias' && (
              <div className="grid grid-cols-7 gap-y-1 text-center" role="grid" aria-label={titulo(vista.y, vista.m)} onKeyDown={alTeclearDia}>
                {DIAS_SEMANA.map((d) => (
                  <span key={d} role="columnheader" className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-400">
                    {d}
                  </span>
                ))}
                {celdas.map((iso, i) => {
                  if (!iso) return <span key={`v${i}`} aria-hidden="true" />
                  const seleccionado = iso === value
                  const esHoy = !nacimiento && iso === hoy
                  const bloqueado = deshabilitada(iso)
                  return (
                    <button
                      key={iso}
                      type="button"
                      data-dia
                      role="gridcell"
                      tabIndex={iso === diaFocoVisible ? 0 : -1}
                      disabled={bloqueado}
                      aria-selected={seleccionado}
                      aria-current={esHoy ? 'date' : undefined}
                      aria-label={formatearFechaLarga(iso)}
                      onClick={() => elegir(iso)}
                      className={cn(
                        'mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors duration-150',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-line',
                        bloqueado && 'cursor-not-allowed text-text-400 opacity-40',
                        !bloqueado && !seleccionado && 'text-text-900 hover:bg-surface-hover',
                        !bloqueado && esHoy && !seleccionado && 'font-semibold text-accent-text shadow-[inset_0_0_0_1px_var(--color-accent-line)]',
                        seleccionado && 'bg-cta font-semibold text-on-cta',
                      )}
                    >
                      {Number(iso.slice(8))}
                    </button>
                  )
                })}
              </div>
            )}

            {min && !nacimiento && (
              <button
                type="button"
                onClick={() => elegir(min)}
                className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-accent-text transition-colors hover:bg-surface-hover"
              >
                Ir a hoy
              </button>
            )}
          </div>,
          document.body,
        )}

      {error && (
        <p role="alert" className="text-xs font-medium text-danger-500">
          {error}
        </p>
      )}
    </div>
  )
}
