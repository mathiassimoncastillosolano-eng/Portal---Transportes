import { useState } from 'react'
import { SelectorUbicacion } from './SelectorUbicacion'
import { SelectorFecha } from './SelectorFecha'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import './buscadorViajes.css'

function obtenerFechaPorDefecto() {
  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  return manana.toISOString().split('T')[0]
}

export function BuscadorViajes({ alBuscar, buscando, valoresIniciales }) {
  const [origen, setOrigen] = useState(valoresIniciales?.origen ?? 'Lima')
  const [destino, setDestino] = useState(valoresIniciales?.destino ?? 'Cusco')
  const [fecha, setFecha] = useState(valoresIniciales?.fecha ?? obtenerFechaPorDefecto())
  const [errorFormulario, setErrorFormulario] = useState('')

  function intercambiarCiudades() {
    setOrigen(destino)
    setDestino(origen)
  }

  function manejarEnvio(evento) {
    evento.preventDefault()
    if (!origen || !destino) {
      setErrorFormulario('Selecciona una ciudad de origen y de destino.')
      return
    }
    if (origen === destino) {
      setErrorFormulario('El origen y el destino deben ser distintos.')
      return
    }
    setErrorFormulario('')
    alBuscar({ origen, destino, fecha })
  }

  return (
    <form className="buscador-viajes" onSubmit={manejarEnvio}>
      <div className="buscador-viajes__campos">
        <SelectorUbicacion etiqueta="Origen" valor={origen} alCambiar={setOrigen} excluir={destino} />

        <button
          type="button"
          className="buscador-viajes__intercambiar"
          onClick={intercambiarCiudades}
          aria-label="Intercambiar origen y destino"
        >
          ⇄
        </button>

        <SelectorUbicacion etiqueta="Destino" valor={destino} alCambiar={setDestino} excluir={origen} />

        <div className="buscador-viajes__separador" aria-hidden="true" />

        <SelectorFecha etiqueta="Fecha" valor={fecha} alCambiar={setFecha} />
      </div>

      <BotonPrincipal tipo="submit" deshabilitado={buscando} ancho="100%">
        {buscando ? 'Buscando…' : 'Buscar pasajes'}
      </BotonPrincipal>

      {errorFormulario && <p className="buscador-viajes__error">{errorFormulario}</p>}
    </form>
  )
}
