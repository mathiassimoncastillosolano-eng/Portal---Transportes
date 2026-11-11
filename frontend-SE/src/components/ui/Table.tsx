import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Skeleton } from '@/components/feedback/Skeleton'
import { cn } from '@/utils/cn'

export interface TableColumn<T> {
  key: string
  header: string
  align?: 'left' | 'right'
  sortable?: boolean
  /** Valor por el que se ordena; obligatorio si `sortable`. */
  sortValue?: (row: T) => string | number
  cell: (row: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  caption: string
  columns: TableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
  loading?: boolean
  /** Contenido cuando no hay filas. */
  empty?: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Tabla del design system: encabezado ordenable (con `aria-sort`), estados de
 * carga y vacío, y scroll horizontal contenido en pantallas estrechas.
 */
export function Table<T>({
  caption,
  columns,
  rows,
  rowKey,
  defaultSort,
  loading = false,
  empty,
  footer,
  className,
}: TableProps<T>) {
  const [sort, setSort] = useState(defaultSort ?? null)

  const ordenadas = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const valor = col.sortValue
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = valor(a)
      const vb = valor(b)
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor
      return String(va).localeCompare(String(vb), 'es') * factor
    })
  }, [rows, columns, sort])

  function alternar(key: string) {
    setSort((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' },
    )
  }

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border', className)}>
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-sunken text-xs uppercase tracking-wide text-text-500">
          <tr>
            {columns.map((col) => {
              const activa = sort?.key === col.key
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={activa ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn('px-4 py-2.5 font-medium', col.align === 'right' ? 'text-right' : 'text-left')}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => alternar(col.key)}
                      className={cn(
                        'inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-text-900',
                        activa && 'text-text-900',
                        col.align === 'right' && 'flex-row-reverse',
                      )}
                    >
                      {col.header}
                      {activa ? (
                        sort.direction === 'asc' ? (
                          <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="h-3 w-3" aria-hidden="true" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 text-text-400" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading
            ? Array.from({ length: 4 }, (_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))
            : ordenadas.map((row) => (
                <tr key={rowKey(row)} className="transition-colors hover:bg-surface-sunken/60">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-2.5 text-text-700',
                        col.align === 'right' && 'text-right tabular-nums',
                        col.className,
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-text-500">
                {empty ?? 'No hay datos para mostrar.'}
              </td>
            </tr>
          )}
        </tbody>
        {footer && !loading && rows.length > 0 && (
          <tfoot className="border-t border-border-strong bg-surface-sunken/60 font-medium text-text-900">
            {footer}
          </tfoot>
        )}
      </table>
    </div>
  )
}
