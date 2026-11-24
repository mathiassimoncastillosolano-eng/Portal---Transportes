import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DashboardComercial } from './DashboardComercial'
import { DATOS_EJEMPLO, FECHA_CORTE } from './datosEjemplo'
import { ThemeSync } from '@/theme/ThemeSync'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeSync />
    <DashboardComercial dias={DATOS_EJEMPLO} fechaCorte={FECHA_CORTE} modoEjemplo />
  </StrictMode>,
)
