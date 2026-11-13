import React from 'react'
import { createRoot } from 'react-dom/client'
import { TarjetaPasajeOriginal } from './componentes/postergacion/TarjetaPasajeOriginal'
import { PasoNuevoViaje } from './componentes/postergacion/PasoNuevoViaje'
import { IndicadorProgreso } from './componentes/reserva/IndicadorProgreso'
import { pasajeEjemplo } from './vistaDatosEjemplo'
import './estilos/globales.css'
import './componentes/postergacion/postergacion.css'

const pasaje = pasajeEjemplo(new URLSearchParams(window.location.search).get('boleto'))

const horarios = [
  ['00:30', 'Estándar', 75, 16, '09:00'],
  ['07:00', 'Semi Cama', 95, 18, '15:30'],
  ['13:30', 'Bus Cama', 125, 9, '22:00'],
  ['20:00', 'Prime', 165, 6, '04:30'],
]

const viajes = horarios.map(([horaSalida, tipoBus, precio, asientosDisponibles, horaLlegada], indice) => ({
  id: indice + 1,
  origen: pasaje.origen,
  destino: pasaje.destino,
  fechaSalida: '2026-11-22',
  horaSalida,
  horaLlegada,
  fechaLlegada: indice === 3 ? '2026-11-23' : '2026-11-22',
  duracion: '8 h 30 min',
  empresa: 'RutaLibre',
  tipoBus,
  precio,
  asientosDisponibles,
  estado: 'disponible',
  estadoReserva: 'DISPONIBLE',
  salidaMs: new Date(`2026-11-22T${horaSalida}:00-05:00`).getTime(),
  limiteReservaMs: new Date(`2026-11-22T${horaSalida}:00-05:00`).getTime() - 20 * 60_000,
  servicios: ['WiFi', 'Baño', 'USB'],
}))

function consultarViajesDeEjemplo(_pasaje, criterios) {
  // La vista local solo ilustra fechas del 18 al 27 de noviembre.
  if (criterios.fecha < '2026-11-18' || criterios.fecha > '2026-11-27') {
    return { viajes: [], ocultos: 0 }
  }
  const diaSiguiente = new Date(Date.parse(`${criterios.fecha}T00:00:00Z`) + 86_400_000)
    .toISOString().slice(0, 10)
  return {
    viajes: viajes.map((viaje) => ({
      ...viaje,
      origen: criterios.origen,
      destino: criterios.destino,
      fechaSalida: criterios.fecha,
      fechaLlegada: viaje.horaSalida === '20:00' ? diaSiguiente : criterios.fecha,
      salidaMs: new Date(`${criterios.fecha}T${viaje.horaSalida}:00-05:00`).getTime(),
      limiteReservaMs: new Date(`${criterios.fecha}T${viaje.horaSalida}:00-05:00`).getTime() - 20 * 60_000,
    })),
    ocultos: 0,
  }
}

async function consultarRutasDeEjemplo() {
  return [
    { origen: 'Lima', destino: 'Trujillo' },
    { origen: 'Lima', destino: 'Piura' },
    { origen: 'Trujillo', destino: 'Lima' },
    { origen: 'Trujillo', destino: 'Cajamarca' },
    { origen: 'Cajamarca', destino: 'Trujillo' },
    { origen: 'Piura', destino: 'Lima' },
  ]
}

function VistaCambioFecha() {
  const [busqueda, setBusqueda] = React.useState(null)

  return (
    <section className="seccion contenedor pagina-postergacion">
      <header className="postergacion-encabezado">
        <div>
          <p className="postergacion-encabezado__eyebrow">CAMBIO DE VIAJE · VISTA LOCAL</p>
          <h1 className="postergacion-encabezado__titulo">Cambia tu viaje</h1>
        </div>
      </header>
      <TarjetaPasajeOriginal pasaje={pasaje} />
      <IndicadorProgreso pasoActual="viaje" etiqueta="Progreso del cambio de viaje" pasos={[
        { clave: 'viaje', etiqueta: 'Nuevo viaje' },
        { clave: 'asiento', etiqueta: 'Asiento' },
        { clave: 'tarifa', etiqueta: 'Diferencia tarifaria' },
        { clave: 'confirmacion', etiqueta: 'Confirmación' },
      ]} />
      <PasoNuevoViaje
        pasaje={pasaje}
        busqueda={busqueda}
        alGuardarBusqueda={setBusqueda}
        alElegir={() => {}}
        alCancelar={() => { window.location.href = '/vista-detalle-compra.html' }}
        consultarViajes={consultarViajesDeEjemplo}
        consultarRutas={consultarRutasDeEjemplo}
      />
    </section>
  )
}

createRoot(document.getElementById('raiz')).render(<VistaCambioFecha />)
