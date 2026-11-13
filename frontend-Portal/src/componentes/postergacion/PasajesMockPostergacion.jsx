import { Link } from 'react-router-dom'
import { ID_COMPRA_DEMO, listarPasajesMock } from '../../mock/postergacion/pasajes'
import { formatearFechaCorta } from '../../utilidades/formato'

export function PasajesMockPostergacion({ idCliente }) {
  const pasajes = listarPasajesMock(idCliente)

  return (
    <>
      <div className="pagina-mis-pasajes__mock pagina-mis-pasajes__mock--compra">
        <div><strong>Compra de prueba · 3 boletos</strong><span>Cambia solo un boleto y revisa el detalle y PDF actualizados.</span></div>
        <Link className="pagina-mis-pasajes__postergar" to="/perfil/pasajes/demo">Ver compra de prueba →</Link>
      </div>
      <details className="pagina-mis-pasajes__mock">
        <summary>Modo desarrollo · otros pasajes MOCK</summary>
        <ul>
          {pasajes.filter((pasaje) => pasaje.idVenta !== ID_COMPRA_DEMO).map((pasaje) => (
            <li key={pasaje.idPasaje}>
              <span>
                {pasaje.numeroBoleto} · {pasaje.origen} → {pasaje.destino} · {formatearFechaCorta(pasaje.fechaSalida)} {pasaje.horaSalida} · {pasaje.etiquetaMock ?? 'Pasaje'}
              </span>
              <Link className="pagina-mis-pasajes__postergar" to={`/postergar/${pasaje.idPasaje}`}>Cambiar viaje</Link>
            </li>
          ))}
        </ul>
      </details>
    </>
  )
}
