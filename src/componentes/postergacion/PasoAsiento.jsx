import { useEffect, useMemo, useState } from 'react'
import { MapaAsientosBus } from '../reserva/MapaAsientosBus'
import { SelectorPiso } from '../reserva/SelectorPiso'
import { PanelAsincrono } from '../carga'
import { mapaConSeleccion, obtenerMapaAsientosPostergacion } from '../../servicios/postergacionMock'

export function PasoAsiento({ pasaje, viaje, asiento, versionMapa, alElegir }) {
  const [mapa, setMapa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [pisoActivo, setPisoActivo] = useState(1)
  const [intentos, setIntentos] = useState(0)

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setError('')
    obtenerMapaAsientosPostergacion(viaje)
      .then((respuesta) => {
        if (cancelado) return
        setMapa(respuesta)
        setCargando(false)
      })
      .catch(() => {
        if (cancelado) return
        setError('No pudimos consultar los asientos de este viaje.')
        setCargando(false)
      })
    return () => { cancelado = true }
  }, [viaje.id, versionMapa, intentos])

  const mapaVisible = useMemo(() => (mapa ? mapaConSeleccion(mapa, asiento?.idAsiento ?? null) : null), [mapa, asiento])

  useEffect(() => {
    if (asiento?.piso) setPisoActivo(asiento.piso)
  }, [asiento?.piso])

  const pisoInfo = mapaVisible?.mapaPorPiso[pisoActivo]

  return (
    <div className="postergacion-paso">
      <div className="postergacion-paso__cabecera">
        <h2 className="postergacion-paso__titulo" tabIndex={-1} data-foco-paso>Elige tu nuevo asiento</h2>
        <p className="postergacion-paso__texto">
          Tu asiento actual es el {pasaje.asiento}. Puedes cambiar tu elección hasta que continúes.
        </p>
      </div>

      <PanelAsincrono
        variante="asientos"
        cargando={cargando}
        error={error || null}
        vacio={!cargando && !error && !pisoInfo}
        alReintentar={() => setIntentos((n) => n + 1)}
        estadoError={{ titulo: 'No pudimos consultar los asientos' }}
        estadoVacio={{ titulo: 'Sin asientos configurados', texto: 'Este viaje no tiene asientos configurados.' }}
        compacto
      >
        {() => (
          <>
            <div className="postergacion-asiento__estado" role="status" aria-live="polite">
              {asiento ? (
                <span className="postergacion-asiento__chip postergacion-asiento__chip--activo">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2.5 7.3 5.5 10.3 11.5 3.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Asiento {asiento.numero}{mapaVisible.pisos > 1 ? ` · Piso ${asiento.piso}` : ''}
                </span>
              ) : (
                <span className="postergacion-asiento__chip">Selecciona un asiento disponible</span>
              )}
              <span className="postergacion-asiento__disponibles">
                {viaje.tipoBus} · {viaje.horaSalida}
              </span>
            </div>
            <SelectorPiso
              pisos={mapaVisible.pisos}
              pisoActivo={pisoActivo}
              alCambiarPiso={setPisoActivo}
              mapaPorPiso={mapaVisible.mapaPorPiso}
            />
            <MapaAsientosBus
              asientos={pisoInfo.asientos}
              filas={pisoInfo.filas}
              limiteAlcanzado={false}
              onSeleccionar={alElegir}
            />
          </>
        )}
      </PanelAsincrono>
    </div>
  )
}
