/** Ventas que muestra el Dashboard: SANDBOX = compras de prueba, PRODUCTION = compras con dinero real. */
export type EntornoVentas = 'SANDBOX' | 'PRODUCTION'

/**
 * Se elige con la variable VITE_DASHBOARD_ENTORNO. Mientras no haya ventas reales, por defecto se muestran
 * las de prueba (SANDBOX); para ver solo dinero real se configura VITE_DASHBOARD_ENTORNO=PRODUCTION.
 */
export const ENTORNO_DASHBOARD: EntornoVentas =
  import.meta.env.VITE_DASHBOARD_ENTORNO === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX'
