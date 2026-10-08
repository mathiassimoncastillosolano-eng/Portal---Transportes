import { useEffect, useState } from 'react'
import { obtenerRutasCiudad } from '../../servicios/destinosServicio'
import { fechaDeManana } from '../../utilidades/fechas'
import { SelectorUbicacion } from './SelectorUbicacion'
import { SelectorFecha } from './SelectorFecha'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import './buscadorViajes.css'

function obtenerFechaPorDefecto() {
  return fechaDeManana()
}

export function BuscadorViajes({ alBuscar, buscando, valoresIniciales, rutasDisponibles, destinoSugerido }) {
  const [origen, setOrigen] = useState(valoresIniciales?.origen ?? '')
  const [destino, setDestino] = useState(valoresIniciales?.destino ?? '')
  const [fecha, setFecha] = useState(valoresIniciales?.fecha ?? obtenerFechaPorDefecto())
  const [errorFormulario, setErrorFormulario] = useState('')
  const [rutas, setRutas] = useState(rutasDisponibles ?? [])
  const [errorCiudades, setErrorCiudades] = useState('')

  useEffect(() => {
    if (rutasDisponibles) {
      setRutas(rutasDisponibles)
      return
    }

    let activo = true

    obtenerRutasCiudad()
      .then((datos) => {
        if (activo) setRutas(datos)
      })
      .catch(() => {
        if (activo) setErrorCiudades('No se pudieron cargar las rutas. Recarga la página para reintentar.')
      })

    return () => { activo = false }
  }, [rutasDisponibles])

  const origenes = [...new Set(rutas
    .filter((ruta) => !destinoSugerido || ruta.destino === destinoSugerido)
    .map((ruta) => ruta.origen))]
    .sort((a, b) => a.localeCompare(b, 'es'))

  const destinosDisponibles = rutas
    .filter((ruta) => ruta.origen === origen)
    .map((ruta) => ruta.destino)
    .sort((a, b) => a.localeCompare(b, 'es'))

  const puedeIntercambiar = Boolean(
    !destinoSugerido && origen && destino &&
    rutas.some((ruta) => ruta.origen === destino && ruta.destino === origen)
  )

  function cambiarOrigen(nuevoOrigen) {
    setOrigen(nuevoOrigen)
    setDestino((actual) => rutas.some((ruta) => ruta.origen === nuevoOrigen && ruta.destino === actual) ? actual : '')
    setErrorFormulario('')
  }

  function intercambiarCiudades() {
    if (!puedeIntercambiar) return
    setOrigen(destino)
    setDestino(origen)
    setErrorFormulario('')
  }

  function manejarEnvio(evento) {
    evento.preventDefault()
    const fechaSeleccionada = new FormData(evento.currentTarget).get('fecha')

    if (!origen || !destino || !fechaSeleccionada) {
      setErrorFormulario('Selecciona origen, destino y fecha.')
      return
    }

    if (!rutas.some((ruta) => ruta.origen === origen && ruta.destino === destino)) {
      setErrorFormulario('Ese destino no está disponible para el origen elegido.')
      return
    }

    setErrorFormulario('')
    alBuscar({ origen, destino, fecha: fechaSeleccionada })
  }

  return (
    <form className="buscador-viajes" onSubmit={manejarEnvio}>
      <div className="buscador-viajes__campos">
        <SelectorUbicacion
          ciudades={origenes}
          etiqueta="Origen"
          valor={origen}
          alCambiar={cambiarOrigen}
        />

        <button
          type="button"
          className="buscador-viajes__intercambiar"
          onClick={intercambiarCiudades}
          disabled={!puedeIntercambiar}
          aria-label="Intercambiar origen y destino"
        >
          ⇄
        </button>

        <SelectorUbicacion
          ciudades={destinosDisponibles}
          etiqueta="Destino"
          valor={destino}
          alCambiar={setDestino}
          deshabilitado={!origen || rutas.length === 0}
        />

        <div className="buscador-viajes__separador" aria-hidden="true" />
        <SelectorFecha etiqueta="Fecha" valor={fecha} alCambiar={setFecha} />
      </div>

      <BotonPrincipal tipo="submit" deshabilitado={buscando} ancho="100%">
        {buscando ? 'Buscando…' : 'Buscar pasajes'}
      </BotonPrincipal>

      {errorCiudades && <p className="buscador-viajes__error">{errorCiudades}</p>}
      {errorFormulario && <p className="buscador-viajes__error">{errorFormulario}</p>}
    </form>
  )
}
