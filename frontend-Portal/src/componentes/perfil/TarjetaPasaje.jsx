import { Link } from 'react-router-dom'
import { EstadoDisponibilidad } from '../comunes/EstadoDisponibilidad'
import { formatearFechaCorta, formatearPrecio } from '../../utilidades/formato'
import { datosFaltantes, estadoVisible, textoAsientos } from '../../utilidades/pasajesVista'
import './tarjetaPasaje.css'

/** Resumen de una compra real. Los datos que falten se indican como tales; nunca se rellenan. */
export function TarjetaPasaje({ compra }) {
  const estado = estadoVisible(compra)
  const faltantes = compra.incompleta ? datosFaltantes(compra) : []
  const hayTrayecto = compra.origen && compra.destino
  const salida = compra.fechaSalida && compra.horaSalida
    ? `${formatearFechaCorta(compra.fechaSalida)} · ${compra.horaSalida}`
    : 'Fecha de salida por confirmar'

  return (
    <article className={`tarjeta-pasaje${compra.vigente ? ' tarjeta-pasaje--vigente' : ''}`}>
      <div className="tarjeta-pasaje__cabecera">
        <span className="tarjeta-pasaje__codigo">COMPRA {compra.codigoCompra}</span>
        <EstadoDisponibilidad estado={estado.clave} etiqueta={estado.etiqueta} />
      </div>
      <div className="tarjeta-pasaje__trayecto">
        {hayTrayecto ? (
          <h3 className="tarjeta-pasaje__ruta">
            <span>{compra.origen}</span><span aria-hidden="true">→</span><span>{compra.destino}</span>
          </h3>
        ) : (
          <h3 className="tarjeta-pasaje__ruta tarjeta-pasaje__ruta--pendiente">Trayecto no disponible</h3>
        )}
        <p className="tarjeta-pasaje__fecha">{salida}</p>
      </div>
      <dl className="tarjeta-pasaje__resumen">
        <div><dt>Servicio</dt><dd>{compra.tipoBus ?? '—'}</dd></div>
        <div><dt>Asientos</dt><dd>{textoAsientos(compra) ?? '—'}</dd></div>
        <div><dt>Total</dt><dd>{formatearPrecio(compra.total, compra.moneda)}</dd></div>
      </dl>
      {faltantes.length > 0 && (
        <p className="tarjeta-pasaje__aviso" role="note">
          Esta compra tiene información incompleta: falta {faltantes.join(', ')}.
        </p>
      )}
      <Link className="tarjeta-pasaje__ver-boleto" to={`/perfil/pasajes/${compra.idVenta}`}>
        Ver detalle y boletos <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}
