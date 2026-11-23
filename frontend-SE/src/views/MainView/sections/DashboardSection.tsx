import { DashboardComercial } from '@/features/dashboard/comercial/DashboardComercial'
import { DATOS_EJEMPLO, FECHA_CORTE } from '@/features/dashboard/comercial/datosEjemplo'

export function DashboardSection() {
  return <DashboardComercial dias={DATOS_EJEMPLO} fechaCorte={FECHA_CORTE} modoEjemplo integrado />
}
