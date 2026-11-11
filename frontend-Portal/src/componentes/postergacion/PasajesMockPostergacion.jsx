import { Link } from 'react-router-dom'
import { listarPasajesMock } from '../../mock/postergacion/pasajes'
import { formatearFechaCorta } from '../../utilidades/formato'

export function PasajesMockPostergacion({ idCliente }) {
  const pasajes = listarPasajesMock(idCliente)

  return (
    <details className="pagina-mis-pasajes__mock">
      <summary>Modo desarrollo · pasajes MOCK para probar la postergación</summary>
      <ul>
        {pasajes.map((pasaje) => (
          <li key={pasaje.idPasaje}>
            <span>
              {pasaje.numeroBoleto} · {pasaje.origen} → {pasaje.destino} · {formatearFechaCorta(pasaje.fechaSalida)} {pasaje.horaSalida} · {pasaje.etiquetaMock ?? 'Pasaje'}
            </span>
            <Link className="pagina-mis-pasajes__postergar" to={`/postergar/${pasaje.idPasaje}`}>Postergar</Link>
          </li>
        ))}
      </ul>
    </details>
  )
}
