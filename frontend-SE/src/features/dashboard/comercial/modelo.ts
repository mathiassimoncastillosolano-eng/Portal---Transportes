export interface VentasDia {
  fecha: string
  webPasajes: number
  webCompras: number
  webIngresos: number
  agenciaPasajes: number
  agenciaCompras: number
  agenciaIngresos: number
}

export interface Totales {
  pasajes: number
  compras: number
  ingresos: number
}

export type Canal = 'web' | 'agencia'

const vacio = (): Totales => ({ pasajes: 0, compras: 0, ingresos: 0 })

/** Suma cada canal por separado para que el total siempre concilie con ambos. */
export function resumir(dias: VentasDia[]) {
  const web = vacio()
  const agencia = vacio()

  for (const dia of dias) {
    web.pasajes += dia.webPasajes
    web.compras += dia.webCompras
    web.ingresos += dia.webIngresos
    agencia.pasajes += dia.agenciaPasajes
    agencia.compras += dia.agenciaCompras
    agencia.ingresos += dia.agenciaIngresos
  }

  return {
    web,
    agencia,
    total: {
      pasajes: web.pasajes + agencia.pasajes,
      compras: web.compras + agencia.compras,
      ingresos: web.ingresos + agencia.ingresos,
    },
  }
}

/** null significa que el período anterior no permite calcular una variación. */
export function variacion(actual: number, anterior: number): number | null {
  return anterior === 0 ? null : ((actual - anterior) / anterior) * 100
}

export function participacion(valor: number, total: number): number {
  return total === 0 ? 0 : (valor / total) * 100
}
