import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search, SearchX } from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  menuPanelClasses,
  optionBaseClasses,
  optionCheckClasses,
  optionStateClasses,
} from './selectStyles'

export interface SelectOption {
  value: string
  label: string
  /** Línea secundaria opcional, ej. "Terminal Lima Norte" o "Bus 1 piso · S/ 32.00". */
  description?: string
  /** Icono pequeño opcional a la izquierda de la opción. */
  icon?: ReactNode
  disabled?: boolean
}

export interface SelectProps {
  label?: string
  hint?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  /** Icono discreto a la izquierda del campo (ubicación, servicio, documento…). */
  icon?: ReactNode
  value?: string
  defaultValue?: string
  onChange?: (value: string, option: SelectOption) => void
  disabled?: boolean
  required?: boolean
  /** Añade un buscador dentro del panel. Úsalo solo cuando la lista es larga. */
  searchable?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  id?: string
  /** Si se indica, el valor viaja en un `<input type="hidden">` (formularios nativos). */
  name?: string
  /** Clases extra para el campo (trigger). */
  className?: string
  containerClassName?: string
  /** Clases extra para la etiqueta visible (ej. variante compacta de la barra de filtros). */
  labelClassName?: string
  /** Nombre accesible cuando el campo no muestra `label` visible. */
  ariaLabel?: string
}

type Phase = 'closed' | 'open' | 'closing'

interface Position {
  side: 'top' | 'bottom'
  left: number
  width: number
  maxHeight: number
  top?: number
  bottom?: number
}

const GAP = 6
const VIEWPORT_MARGIN = 8
const MAX_LIST_HEIGHT = 288
const SEARCH_HEIGHT = 45
const MIN_PANEL_WIDTH = 220
const CLOSE_MS = 120

/** Minúsculas y sin tildes, para búsqueda y typeahead tolerantes ("peru" encuentra "Perú"). */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function moveIndex(list: SelectOption[], from: number, step: 1 | -1): number {
  let i = from + step
  while (i >= 0 && i < list.length) {
    if (!list[i].disabled) return i
    i += step
  }
  return from
}

function firstEnabled(list: SelectOption[]): number {
  return list.findIndex((o) => !o.disabled)
}

function lastEnabled(list: SelectOption[]): number {
  for (let i = list.length - 1; i >= 0; i--) if (!list[i].disabled) return i
  return -1
}

/** Calcula dónde colocar el panel: abajo por defecto, arriba si no cabe, siempre dentro del viewport. */
function calcularPosicion(trigger: HTMLElement, searchable: boolean): Position {
  const rect = trigger.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const espacioAbajo = vh - rect.bottom - GAP - VIEWPORT_MARGIN
  const espacioArriba = rect.top - GAP - VIEWPORT_MARGIN
  const deseado = MAX_LIST_HEIGHT + 12 + (searchable ? SEARCH_HEIGHT : 0)

  const side: Position['side'] =
    espacioAbajo >= Math.min(deseado, 240) || espacioAbajo >= espacioArriba ? 'bottom' : 'top'
  const disponible = side === 'bottom' ? espacioAbajo : espacioArriba
  const maxHeight = Math.max(120, Math.min(deseado, disponible))

  const width = Math.min(Math.max(rect.width, MIN_PANEL_WIDTH), vw - VIEWPORT_MARGIN * 2)
  const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN), vw - VIEWPORT_MARGIN - width)

  return side === 'bottom'
    ? { side, left, width, maxHeight, top: rect.bottom + GAP }
    : { side, left, width, maxHeight, bottom: vh - rect.top + GAP }
}

function mismaPosicion(a: Position | null, b: Position): boolean {
  return (
    !!a &&
    a.side === b.side &&
    a.left === b.left &&
    a.width === b.width &&
    a.maxHeight === b.maxHeight &&
    a.top === b.top &&
    a.bottom === b.bottom
  )
}

/**
 * ComboBox / Select único del design system. Reemplaza al `<select>` nativo
 * con un listbox propio (patrón ARIA select-only combobox) para controlar
 * por completo campo, panel, estados y animación.
 *
 * - Panel en un portal con posición `fixed`: no lo recorta ningún `overflow`
 *   de tarjetas/modales y se abre hacia arriba si abajo no hay espacio.
 * - Teclado: ↑ ↓ Home End, Enter/Espacio, Esc, Tab y typeahead.
 * - Opciones con línea secundaria (`description`) e icono opcionales.
 * - `searchable` añade un buscador (con filtro sin tildes) para listas largas.
 */
export function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  icon,
  value,
  defaultValue = '',
  onChange,
  disabled,
  required,
  searchable = false,
  searchPlaceholder = 'Buscar…',
  emptyMessage = 'Sin resultados',
  id,
  name,
  className,
  containerClassName,
  labelClassName,
  ariaLabel,
}: SelectProps) {
  const generatedId = useId()
  const triggerId = id ?? `${generatedId}-trigger`
  const labelId = `${generatedId}-label`
  const valueId = `${generatedId}-value`
  const listboxId = `${generatedId}-listbox`
  const hintId = hint ? `${generatedId}-hint` : undefined
  const errorId = error ? `${generatedId}-error` : undefined
  const optionId = (i: number) => `${listboxId}-opt-${i}`

  const [innerValue, setInnerValue] = useState(defaultValue)
  const current = value ?? innerValue
  const selected = options.find((o) => o.value === current)

  const [phase, setPhase] = useState<Phase>('closed')
  const [position, setPosition] = useState<Position | null>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const open = phase === 'open'

  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const typeahead = useRef({ buffer: '', timer: 0 })
  const scrollOnActive = useRef(true)

  const filtered = useMemo(() => {
    const q = normalizar(query.trim())
    if (!searchable || !q) return options
    return options.filter((o) => normalizar(`${o.label} ${o.description ?? ''}`).includes(q))
  }, [options, query, searchable])

  useEffect(
    () => () => {
      window.clearTimeout(closeTimer.current)
      window.clearTimeout(typeahead.current.timer)
    },
    [],
  )

  const openMenu = useCallback(() => {
    if (disabled) return
    window.clearTimeout(closeTimer.current)
    const idx = options.findIndex((o) => o.value === current && !o.disabled)
    scrollOnActive.current = true
    setQuery('')
    setActive(idx >= 0 ? idx : firstEnabled(options))
    setPhase('open')
  }, [disabled, options, current])

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setPhase((p) => (p === 'open' ? 'closing' : p))
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => {
      setPhase('closed')
      setQuery('')
    }, CLOSE_MS)
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  const commit = useCallback(
    (option: SelectOption) => {
      if (option.disabled) return
      if (option.value !== current) {
        setInnerValue(option.value)
        onChange?.(option.value, option)
      }
      closeMenu(true)
    },
    [current, onChange, closeMenu],
  )

  // Posición inicial antes de pintar (evita un frame en el sitio equivocado).
  useLayoutEffect(() => {
    if (phase !== 'open' || !triggerRef.current) return
    setPosition(calcularPosicion(triggerRef.current, searchable))
  }, [phase, searchable])

  // Reposicionar con resize y con scroll de cualquier ancestro; ignora el scroll interno de la lista.
  useEffect(() => {
    if (phase === 'closed') return
    function reposicionar(event?: Event) {
      if (event?.target instanceof Node && popupRef.current?.contains(event.target)) return
      if (!triggerRef.current) return
      const next = calcularPosicion(triggerRef.current, searchable)
      setPosition((prev) => (mismaPosicion(prev, next) ? prev : next))
    }
    window.addEventListener('resize', reposicionar)
    window.addEventListener('scroll', reposicionar, true)
    return () => {
      window.removeEventListener('resize', reposicionar)
      window.removeEventListener('scroll', reposicionar, true)
    }
  }, [phase, searchable])

  // Cerrar al pulsar fuera del campo y del panel.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || popupRef.current?.contains(target)) return
      closeMenu(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, closeMenu])

  // En modo buscador el foco pasa al input del panel en cuanto existe.
  const panelListo = position !== null
  useEffect(() => {
    if (open && searchable && panelListo) searchRef.current?.focus({ preventScroll: true })
  }, [open, searchable, panelListo])

  // Mantener visible la opción activa cuando la navegación es por teclado.
  useEffect(() => {
    if (!open || active < 0 || !scrollOnActive.current) return
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, panelListo, filtered])

  function buscarPorTecla(key: string) {
    const ta = typeahead.current
    window.clearTimeout(ta.timer)
    ta.buffer += normalizar(key)
    ta.timer = window.setTimeout(() => {
      ta.buffer = ''
    }, 600)
    const start = ta.buffer.length === 1 ? active + 1 : Math.max(active, 0)
    for (let n = 0; n < filtered.length; n++) {
      const i = (start + n) % filtered.length
      if (!filtered[i].disabled && normalizar(filtered[i].label).startsWith(ta.buffer)) {
        scrollOnActive.current = true
        setActive(i)
        return
      }
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (disabled) return
    const { key } = event

    if (!open) {
      if (event.target !== triggerRef.current) return
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault()
        openMenu()
      } else if (!searchable && key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        openMenu()
        buscarPorTecla(key)
      }
      return
    }

    switch (key) {
      case 'ArrowDown':
        event.preventDefault()
        scrollOnActive.current = true
        setActive((a) => (a < 0 ? firstEnabled(filtered) : moveIndex(filtered, a, 1)))
        break
      case 'ArrowUp':
        event.preventDefault()
        scrollOnActive.current = true
        setActive((a) => (a < 0 ? lastEnabled(filtered) : moveIndex(filtered, a, -1)))
        break
      case 'Home':
        if (searchable) return
        event.preventDefault()
        scrollOnActive.current = true
        setActive(firstEnabled(filtered))
        break
      case 'End':
        if (searchable) return
        event.preventDefault()
        scrollOnActive.current = true
        setActive(lastEnabled(filtered))
        break
      case 'Enter':
        event.preventDefault() // evita enviar el formulario que contiene al campo
        if (filtered[active]) commit(filtered[active])
        break
      case ' ':
        if (searchable) return
        event.preventDefault()
        if (filtered[active]) commit(filtered[active])
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation() // no cierres además el modal/drawer que contenga el campo
        closeMenu(true)
        break
      case 'Tab':
        closeMenu(true)
        break
      default:
        if (!searchable && key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault()
          buscarPorTecla(key)
        }
    }
  }

  const activeId = open && active >= 0 && filtered[active] ? optionId(active) : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label id={labelId} htmlFor={triggerId} className={cn('text-sm font-medium text-text-700', labelClassName)}>
          {label}
          {required && (
            <span className="ml-0.5 text-danger-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role={searchable ? undefined : 'combobox'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={searchable ? undefined : activeId}
        aria-labelledby={ariaLabel ? undefined : label ? `${labelId} ${valueId}` : valueId}
        aria-label={ariaLabel ? `${ariaLabel}: ${selected?.label ?? ''}` : undefined}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        data-open={open}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={cn(
          'group flex h-9 w-full items-center gap-2 rounded-lg border border-border-strong bg-surface-card pl-3 pr-2.5 text-left text-sm text-text-900',
          'transition-[border-color,background-color,box-shadow] duration-150 ease-[var(--ease-premium)]',
          'hover:border-text-400/60 hover:bg-surface-sunken/60',
          'focus-visible:border-accent-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-400/20',
          'data-[open=true]:border-accent-400 data-[open=true]:ring-3 data-[open=true]:ring-accent-400/20',
          'disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-sunken disabled:text-text-500 disabled:hover:border-border disabled:hover:bg-surface-sunken',
          error &&
            'border-danger-500 hover:border-danger-500 focus-visible:border-danger-500 focus-visible:ring-danger-500/20 data-[open=true]:border-danger-500 data-[open=true]:ring-danger-500/20',
          className,
        )}
      >
        {icon && (
          <span
            aria-hidden="true"
            className="flex h-4 w-4 shrink-0 items-center justify-center text-text-400 transition-colors duration-150 group-data-[open=true]:text-accent-600 dark:group-data-[open=true]:text-accent-400"
          >
            {icon}
          </span>
        )}
        <span
          id={valueId}
          className={cn('min-w-0 flex-1 truncate', selected ? 'text-text-900' : 'text-text-400', disabled && 'text-text-500')}
        >
          {selected?.label ?? placeholder ?? '\u00A0'}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-text-400 transition-[transform,color] duration-200 ease-[var(--ease-premium)] group-hover:text-text-500 group-data-[open=true]:rotate-180 group-data-[open=true]:text-text-700"
        />
      </button>

      {name && <input type="hidden" name={name} value={current} />}

      {phase !== 'closed' &&
        position &&
        createPortal(
          <div
            ref={popupRef}
            data-state={open ? 'open' : 'closed'}
            data-side={position.side}
            style={{
              position: 'fixed',
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: position.maxHeight,
            }}
            // Mantiene el foco en el campo al pulsar opciones; el input de búsqueda sí debe recibirlo.
            onMouseDown={(e) => {
              if (!(e.target instanceof HTMLInputElement)) e.preventDefault()
            }}
            className={cn('select-popup z-[120] flex flex-col overflow-hidden', menuPanelClasses)}
          >
            {searchable && (
              <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="text"
                  role="combobox"
                  aria-expanded={open}
                  aria-controls={listboxId}
                  aria-activedescendant={activeId}
                  aria-autocomplete="list"
                  aria-label={searchPlaceholder}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => {
                    const q = normalizar(e.target.value.trim())
                    const next = q
                      ? options.filter((o) => normalizar(`${o.label} ${o.description ?? ''}`).includes(q))
                      : options
                    scrollOnActive.current = true
                    setQuery(e.target.value)
                    setActive(firstEnabled(next))
                  }}
                  onKeyDown={onKeyDown}
                  className="h-5 w-full bg-transparent text-sm text-text-900 outline-none placeholder:text-text-400 focus-visible:outline-none"
                />
              </div>
            )}

            <div
              id={listboxId}
              role="listbox"
              aria-labelledby={label ? labelId : undefined}
              hidden={filtered.length === 0}
              className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
            >
              {filtered.map((option, i) => {
                const isSelected = option.value === current
                const isActive = i === active
                return (
                  <div
                    key={option.value}
                    id={optionId(i)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    onMouseMove={() => {
                      scrollOnActive.current = false
                      if (!option.disabled && active !== i) setActive(i)
                    }}
                    onClick={() => commit(option)}
                    className={cn(
                      optionBaseClasses,
                      optionStateClasses(isSelected, isActive),
                      option.disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    {option.icon && (
                      <span aria-hidden="true" className="flex h-4 w-4 shrink-0 items-center justify-center text-text-400">
                        {option.icon}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate', isSelected && 'font-medium')}>{option.label}</span>
                      {option.description && (
                        <span className="block truncate text-xs text-text-500">{option.description}</span>
                      )}
                    </span>
                    {isSelected && <Check className={optionCheckClasses} aria-hidden="true" />}
                  </div>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <div role="status" className="flex flex-col items-center gap-1.5 px-3 py-6 text-sm text-text-500">
                <SearchX className="h-4 w-4 text-text-400" aria-hidden="true" />
                {emptyMessage}
              </div>
            )}
          </div>,
          document.body,
        )}

      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger-500">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-text-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
