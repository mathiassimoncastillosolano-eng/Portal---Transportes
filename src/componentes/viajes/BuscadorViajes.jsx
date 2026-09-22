import { useEffect, useState } from 'react'
import { obtenerDestinos } from '../../servicios/destinosServicio'
import { fechaDeManana } from '../../utilidades/fechas'
import { SelectorUbicacion } from './SelectorUbicacion'
import { SelectorFecha } from './SelectorFecha'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import './buscadorViajes.css'

function obtenerFechaPorDefecto() {
  return fechaDeManana()
}

export function BuscadorViajes({ alBuscar, buscando, valoresIniciales }) {
  const [origen, setOrigen] = useState(valoresIniciales?.origen ?? 'Lima')
  const [destino, setDestino] = useState(valoresIniciales?.destino ?? 'Cusco')
  const [fecha, setFecha] = useState(valoresIniciales?.fecha ?? obtenerFechaPorDefecto())
  const [errorFormulario, setErrorFormulario] = useState('')
  const [ciudades, setCiudades] = useState([])
  const [errorCiudades, setErrorCiudades] = useState('')
  useEffect(() => {
    let activo = true
    obtenerDestinos().then((destinos) => {
      if (activo) setCiudades(destinos.map((destino) => destino.ciudad))
    }).catch(() => {
      if (activo) setErrorCiudades('No se pudieron cargar las ciudades. Recarga la página para reintentar.')
    })
    return () => { activo = false }
  }, [])

  function intercambiarCiudades() {
    setOrigen(destino)
    setDestino(origen)
  }

  function manejarEnvio(evento) {
    evento.preventDefault()
    const fechaSeleccionada = new FormData(evento.currentTarget).get('fecha')
    if (!origen || !destino || !fechaSeleccionada) {
      setErrorFormulario('Selecciona origen, destino y fecha.')
      return
    }
    if (origen === destino) {
      setErrorFormulario('El origen y el destino deben ser distintos.')
      return
    }
    setErrorFormulario('')
    alBuscar({ origen, destino, fecha: fechaSeleccionada })
  }

  return (
    <form className="buscador-viajes" onSubmit={manejarEnvio}>
      <div className="buscador-viajes__campos">
        <SelectorUbicacion ciudades={ciudades} etiqueta="Origen" valor={origen} alCambiar={setOrigen} excluir={destino} />

        <button
          type="button"
          className="buscador-viajes__intercambiar"
          onClick={intercambiarCiudades}
          aria-label="Intercambiar origen y destino"
        >
          ⇄
        </button>

        <SelectorUbicacion ciudades={ciudades} etiqueta="Destino" valor={destino} alCambiar={setDestino} excluir={origen} />

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
