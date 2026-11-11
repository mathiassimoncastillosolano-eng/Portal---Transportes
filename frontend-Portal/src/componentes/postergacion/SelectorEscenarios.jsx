import { useId } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  OPCIONES_ASIENTO,
  OPCIONES_PAGO,
  OPCIONES_TARIFA,
} from '../../mock/postergacion/escenarios'
import { listarPasajesMock } from '../../mock/postergacion/pasajes'

function Campo({ etiqueta, valor, opciones, alCambiar }) {
  const id = useId()
  return (
    <div className="escenarios__campo">
      <label htmlFor={id}>{etiqueta}</label>
      <select id={id} value={valor} onChange={(evento) => alCambiar(evento.target.value)}>
        {opciones.map((opcion) => <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>)}
      </select>
    </div>
  )
}

export function SelectorEscenarios({ idCliente, idPasajeActual, escenario, alCambiarEscenario }) {
  const navegar = useNavigate()
  const pasajes = listarPasajesMock(idCliente)

  return (
    <details className="escenarios">
      <summary>Modo desarrollo · escenarios MOCK</summary>
      <div className="escenarios__cuerpo">
        <Campo
          etiqueta="Pasaje"
          valor={String(idPasajeActual)}
          opciones={pasajes.map((p) => ({ valor: String(p.idPasaje), etiqueta: `${p.idPasaje} · ${p.etiquetaMock ?? 'Pasaje real'}` }))}
          alCambiar={(valor) => navegar(`/postergar/${valor}`, { replace: true })}
        />
        <Campo
          etiqueta="Tarifa del nuevo viaje"
          valor={escenario.tarifa}
          opciones={OPCIONES_TARIFA}
          alCambiar={(valor) => alCambiarEscenario({ ...escenario, tarifa: valor })}
        />
        <Campo
          etiqueta="Resultado del pago"
          valor={escenario.pago}
          opciones={OPCIONES_PAGO}
          alCambiar={(valor) => alCambiarEscenario({ ...escenario, pago: valor })}
        />
        <Campo
          etiqueta="Disponibilidad del asiento"
          valor={escenario.asiento}
          opciones={OPCIONES_ASIENTO}
          alCambiar={(valor) => alCambiarEscenario({ ...escenario, asiento: valor })}
        />
        <p className="escenarios__nota">
          La tarifa forzada se aplica al elegir el viaje. Cambia los escenarios antes de ese paso.
        </p>
        <button type="button" className="escenarios__reiniciar" onClick={() => window.location.reload()}>Restablecer datos MOCK</button>
      </div>
    </details>
  )
}
