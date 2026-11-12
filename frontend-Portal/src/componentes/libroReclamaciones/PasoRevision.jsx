import { formatearFechaCorta, formatearPrecio } from '../../utilidades/formato'
import { TIPOS_DOCUMENTO } from '../../utilidades/validarReclamo'

function Fila({ etiqueta, valor, ancha }) {
  if (valor === null || valor === undefined || valor === '') return null
  return (
    <div className={ancha ? 'libro-datos__ancha' : undefined}>
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  )
}

function Bloque({ titulo, children }) {
  return (
    <section className="libro-resumen__bloque">
      <h3>{titulo}</h3>
      <dl className="libro-datos">{children}</dl>
    </section>
  )
}

export function PasoRevision({ formulario, cambiar, errores, pasajeElegido, alEditar }) {
  const documento = TIPOS_DOCUMENTO.find((t) => t.valor === formulario.tipoDocumento)?.texto
  const monto = String(formulario.montoReclamado).trim()
  const servicio = pasajeElegido
    ? { origen: pasajeElegido.origen, destino: pasajeElegido.destino, fecha: pasajeElegido.fechaSalida, asiento: pasajeElegido.asiento, codigo: pasajeElegido.numeroBoleto }
    : { origen: formulario.origen, destino: formulario.destino, fecha: formulario.fechaServicio, asiento: formulario.numeroAsiento, codigo: formulario.codigoViaje }

  return (
    <div className="libro-campos">
      <p className="libro-nota libro-nota--info">Revisa tu información. Podrás editar cada sección antes de enviar.</p>

      <div className="libro-resumen">
        <Bloque titulo="Consumidor">
          <Fila etiqueta="Nombre" valor={formulario.nombresCompletos} />
          <Fila etiqueta={documento} valor={formulario.numeroDocumento.toUpperCase()} />
          <Fila etiqueta="Domicilio" valor={formulario.domicilio} />
          <Fila etiqueta="Teléfono" valor={formulario.telefono} />
          <Fila etiqueta="Correo" valor={formulario.correo} />
        </Bloque>
        <button type="button" className="libro-resumen__editar" onClick={() => alEditar(0)}>Editar datos</button>

        <Bloque titulo="Servicio">
          <Fila etiqueta="Servicio involucrado" valor={formulario.servicioInvolucrado} />
          <Fila etiqueta={pasajeElegido ? 'Código de pasaje' : 'Código de viaje'} valor={servicio.codigo} />
          <Fila etiqueta="Origen" valor={servicio.origen} />
          <Fila etiqueta="Destino" valor={servicio.destino} />
          <Fila etiqueta="Fecha del servicio" valor={servicio.fecha ? formatearFechaCorta(servicio.fecha) : null} />
          <Fila etiqueta="Asiento" valor={servicio.asiento} />
        </Bloque>
        <button type="button" className="libro-resumen__editar" onClick={() => alEditar(1)}>Editar servicio</button>

        <Bloque titulo="Requerimiento">
          <Fila etiqueta="Tipo" valor={formulario.tipoRequerimiento === 'QUEJA' ? 'Queja' : 'Reclamo'} />
          <Fila etiqueta="Descripción del servicio" valor={formulario.descripcionServicio} ancha />
          <Fila etiqueta="Fecha del incidente" valor={formatearFechaCorta(formulario.fechaIncidente)} />
          <Fila etiqueta="Monto reclamado" valor={monto === '' ? 'No indicado' : formatearPrecio(monto.replace(',', '.'), formulario.moneda)} />
          <Fila etiqueta="Detalle de los hechos" valor={formulario.detalleHechos} ancha />
          <Fila etiqueta="Pedido del consumidor" valor={formulario.pedidoConsumidor} ancha />
        </Bloque>
        <button type="button" className="libro-resumen__editar" onClick={() => alEditar(2)}>Editar reclamación</button>

        <Bloque titulo="Medio de respuesta">
          <Fila etiqueta="Correo electrónico" valor={formulario.correo} />
        </Bloque>
      </div>

      <div className="libro-declaraciones">
        <label className="libro-check">
          <input
            type="checkbox"
            checked={formulario.declaracionVeracidad}
            onChange={(e) => cambiar('declaracionVeracidad', e.target.checked)}
            aria-invalid={errores.declaracionVeracidad ? 'true' : undefined}
          />
          <span>Declaro que la información consignada es veraz y corresponde a los hechos ocurridos.</span>
        </label>
        {errores.declaracionVeracidad && <span className="campo-texto__error">{errores.declaracionVeracidad}</span>}

        <label className="libro-check">
          <input
            type="checkbox"
            checked={formulario.autorizaTratamientoDatos}
            onChange={(e) => cambiar('autorizaTratamientoDatos', e.target.checked)}
            aria-invalid={errores.autorizaTratamientoDatos ? 'true' : undefined}
          />
          <span>
            Autorizo el tratamiento de mis datos personales para gestionar y responder esta reclamación, conforme a la
            Ley N.º 29733 de Protección de Datos Personales.
          </span>
        </label>
        {errores.autorizaTratamientoDatos && <span className="campo-texto__error">{errores.autorizaTratamientoDatos}</span>}
      </div>

      <p className="libro-nota">
        La clasificación como reclamo o queja es referencial: la empresa atenderá tu caso según su contenido y la normativa
        aplicable. El Libro de Reclamaciones no limita tus derechos como consumidor ni el acceso a Indecopi.
      </p>
    </div>
  )
}
