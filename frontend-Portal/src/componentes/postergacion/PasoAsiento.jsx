import { useEffect, useState } from 'react'
import { InfoViajeCompacta } from '../reserva/InfoViajeCompacta'
import { MapaAsientosBus } from '../reserva/MapaAsientosBus'
import { SelectorPiso } from '../reserva/SelectorPiso'
import { PanelAsincrono } from '../carga'
import { useMapaAsientosReprogramacion } from '../../hooks/useMapaAsientosReprogramacion'
import { viajeParaMostrar } from '../../utilidades/reprogramacionAsientos'

// Reprogramación · Paso "Elige tu nuevo asiento".
// Muestra el mapa real del viaje elegido. Solo se puede tener UN asiento: al elegir
// otro, el anterior se libera; al tocar el elegido, se libera.
//
// Props:
//  - viaje: el viaje elegido en el paso anterior (misma forma que devuelve la búsqueda).
//  - alElegir(asiento | null): avisa a la pantalla cuál es el asiento elegido.
//  - alGuardarSesion(sesion): entrega la sesión de reserva (la pantalla maneja el temporizador).
//  - alSesionVencida(): avisa que la sesión venció (el pasajero vuelve a elegir viaje).
export function PasoAsiento({ pasaje, viaje, versionMapa, alElegir, alGuardarSesion, alSesionVencida }) {
  const [pisoActivo, setPisoActivo] = useState(1)
  const {
    mapa,
    cargando,
    error,
    errorBloqueo,
    asientoElegido,
    asientosEnProceso,
    seleccionarAsiento,
    reintentar,
  } = useMapaAsientosReprogramacion({
    viaje,
    versionMapa,
    alGuardarSesion,
    alCambiarAsiento: alElegir,
    alSesionVencida,
  })

  // Al elegir un asiento se muestra el piso donde está.
  useEffect(() => {
    if (asientoElegido?.piso) setPisoActivo(asientoElegido.piso)
  }, [asientoElegido?.piso])

  const pisoInfo = mapa?.mapaPorPiso[pisoActivo]

  return (
    <div className="postergacion-paso">
      <div className="postergacion-paso__cabecera">
        <h2 className="postergacion-paso__titulo" tabIndex={-1} data-foco-paso>Elige tu nuevo asiento</h2>
        <p className="postergacion-paso__texto postergacion-paso__texto--ancho">
          Tu asiento actual es el {pasaje.asiento}. Solo puedes elegir uno: si eliges otro, el anterior se libera.
        </p>
      </div>

      <PanelAsincrono
        variante="asientos"
        cargando={cargando}
        error={error || null}
        vacio={!cargando && !error && !pisoInfo}
        alReintentar={reintentar}
        estadoError={{ titulo: 'No pudimos consultar los asientos' }}
        estadoVacio={{ titulo: 'Sin asientos configurados', texto: 'Este viaje no tiene asientos configurados.' }}
        compacto
      >
        {() => (
          <>
            <InfoViajeCompacta resultado={viajeParaMostrar(viaje)} fecha={viaje.fechaSalida} />
            <SelectorPiso
              pisos={mapa.pisos}
              pisoActivo={pisoActivo}
              alCambiarPiso={setPisoActivo}
              mapaPorPiso={mapa.mapaPorPiso}
            />
            {errorBloqueo && (
              <p className="postergacion-aviso postergacion-aviso--aviso" role="alert">{errorBloqueo}</p>
            )}
            <MapaAsientosBus
              asientos={pisoInfo.asientos}
              filas={pisoInfo.filas}
              limiteAlcanzado={false}
              asientosEnProceso={asientosEnProceso}
              onSeleccionar={seleccionarAsiento}
            />
          </>
        )}
      </PanelAsincrono>
    </div>
  )
}
