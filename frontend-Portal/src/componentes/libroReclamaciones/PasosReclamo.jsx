import { useId } from 'react'
import { CampoTexto } from '../comunes/CampoTexto'
import { CampoSeleccion } from '../comunes/CampoSeleccion'
import { LIMITES, SERVICIOS, TIPOS_DOCUMENTO } from '../../utilidades/validarReclamo'
import { formatearFechaCorta } from '../../utilidades/formato'
import { IconoQueja, IconoReclamo } from './iconosLibro'

export function CampoArea({ etiqueta, valor, alCambiar, maximo, minimo, error, ayuda, filas = 5, marcador }) {
  const id = useId()
  const largo = valor.length
  return (
    <div className="campo-texto libro-area">
      <label className="campo-texto__etiqueta" htmlFor={id}>{etiqueta}</label>
      <textarea
        id={id}
        className={`campo-texto__entrada libro-area__entrada ${error ? 'campo-texto__entrada--error' : ''}`}
        rows={filas}
        value={valor}
        maxLength={maximo}
        placeholder={marcador}
        onChange={(evento) => alCambiar(evento.target.value)}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={`${id}-pie`}
      />
      <div className="libro-area__pie" id={`${id}-pie`}>
        {error ? <span className="campo-texto__error">{error}</span> : <span className="campo-texto__ayuda">{ayuda}</span>}
        <span className={`libro-area__contador ${largo >= maximo ? 'libro-area__contador--limite' : ''}`}>
          {largo}/{maximo}
          {minimo && largo < minimo ? ` · mín. ${minimo}` : ''}
        </span>
      </div>
    </div>
  )
}

export function PasoDatosPersonales({ formulario, cambiar, errores, sesionIniciada }) {
  return (
    <div className="libro-campos">
      {sesionIniciada && (
        <p className="libro-nota libro-nota--info">
          Completamos tus datos con los de tu cuenta. Revísalos y corrígelos si hace falta.
        </p>
      )}
      <div className="libro-campos__fila libro-campos__fila--completa">
        <CampoTexto
          etiqueta="Nombres y apellidos completos"
          valor={formulario.nombresCompletos}
          alCambiar={(v) => cambiar('nombresCompletos', v)}
          error={errores.nombresCompletos}
          autoComplete="name"
          marcador="Como figura en tu documento"
        />
      </div>
      <div className="libro-campos__fila">
        <CampoSeleccion
          etiqueta="Tipo de documento"
          valor={formulario.tipoDocumento}
          alCambiar={(v) => cambiar('tipoDocumento', v)}
          opciones={TIPOS_DOCUMENTO}
        />
        <CampoTexto
          etiqueta="Número de documento"
          valor={formulario.numeroDocumento}
          alCambiar={(v) => cambiar('numeroDocumento', v)}
          error={errores.numeroDocumento}
          modoEntrada={formulario.tipoDocumento === 'DNI' ? 'numeric' : 'text'}
          marcador={formulario.tipoDocumento === 'DNI' ? '8 dígitos' : ''}
        />
      </div>
      <div className="libro-campos__fila libro-campos__fila--completa">
        <CampoTexto
          etiqueta="Domicilio"
          valor={formulario.domicilio}
          alCambiar={(v) => cambiar('domicilio', v)}
          error={errores.domicilio}
          autoComplete="street-address"
          marcador="Calle, número, distrito y ciudad"
        />
      </div>
      <div className="libro-campos__fila">
        <CampoTexto
          etiqueta="Teléfono"
          tipo="tel"
          valor={formulario.telefono}
          alCambiar={(v) => cambiar('telefono', v)}
          error={errores.telefono}
          autoComplete="tel"
          modoEntrada="tel"
        />
        <CampoTexto
          etiqueta="Correo electrónico"
          tipo="email"
          valor={formulario.correo}
          alCambiar={(v) => cambiar('correo', v)}
          error={errores.correo}
          autoComplete="email"
          ayuda="Aquí recibirás la respuesta a tu reclamación."
        />
      </div>
      <p className="libro-nota">No necesitas crear una cuenta para registrar tu reclamación.</p>
    </div>
  )
}

export function PasoServicio({ formulario, cambiar, errores, pasajes, cargandoPasajes, alElegirPasaje }) {
  const conPasaje = formulario.idPasaje !== ''
  const pasajeElegido = pasajes.find((p) => String(p.idPasaje) === String(formulario.idPasaje))
  const opcionesPasaje = [
    { valor: '', texto: 'No está relacionado con un pasaje de mi cuenta' },
    ...pasajes.map((p) => ({ valor: String(p.idPasaje), texto: p.etiqueta })),
  ]

  return (
    <div className="libro-campos">
      <div className="libro-campos__fila libro-campos__fila--completa">
        <CampoSeleccion
          etiqueta="Servicio involucrado"
          valor={formulario.servicioInvolucrado}
          alCambiar={(v) => cambiar('servicioInvolucrado', v)}
          opciones={SERVICIOS.map((s) => ({ valor: s, texto: s }))}
          error={errores.servicioInvolucrado}
        />
      </div>

      {(pasajes.length > 0 || cargandoPasajes) && (
        <div className="libro-campos__fila libro-campos__fila--completa">
          <CampoSeleccion
            etiqueta={cargandoPasajes ? 'Cargando tus pasajes…' : 'Pasaje de tu cuenta (opcional)'}
            valor={formulario.idPasaje}
            alCambiar={alElegirPasaje}
            opciones={opcionesPasaje}
          />
        </div>
      )}

      {conPasaje && pasajeElegido ? (
        <dl className="libro-datos libro-datos--tarjeta">
          <div><dt>Código de pasaje</dt><dd>{pasajeElegido.numeroBoleto}</dd></div>
          <div><dt>Ruta</dt><dd>{pasajeElegido.origen} → {pasajeElegido.destino}</dd></div>
          <div><dt>Fecha del servicio</dt><dd>{formatearFechaCorta(pasajeElegido.fechaSalida)}</dd></div>
          <div><dt>Asiento</dt><dd>{pasajeElegido.asiento ?? '—'}</dd></div>
        </dl>
      ) : (
        <>
          <p className="libro-nota">
            Los datos del viaje son opcionales: complétalos solo si tu requerimiento se relaciona con un viaje concreto.
          </p>
          <div className="libro-campos__fila">
            <CampoTexto etiqueta="Ciudad de origen" valor={formulario.origen} alCambiar={(v) => cambiar('origen', v)} error={errores.origen} />
            <CampoTexto etiqueta="Ciudad de destino" valor={formulario.destino} alCambiar={(v) => cambiar('destino', v)} error={errores.destino} />
          </div>
          <div className="libro-campos__fila">
            <CampoTexto etiqueta="Fecha del servicio" tipo="date" valor={formulario.fechaServicio} alCambiar={(v) => cambiar('fechaServicio', v)} error={errores.fechaServicio} />
            <CampoTexto etiqueta="Número de asiento" valor={formulario.numeroAsiento} alCambiar={(v) => cambiar('numeroAsiento', v)} error={errores.numeroAsiento} />
          </div>
          <div className="libro-campos__fila libro-campos__fila--completa">
            <CampoTexto etiqueta="Código del viaje" valor={formulario.codigoViaje} alCambiar={(v) => cambiar('codigoViaje', v)} error={errores.codigoViaje} />
          </div>
        </>
      )}
    </div>
  )
}

const TIPOS = [
  {
    valor: 'RECLAMO',
    titulo: 'Reclamo',
    Icono: IconoReclamo,
    descripcion: 'Disconformidad con el servicio contratado.',
    ejemplos: 'Retraso o cancelación del viaje, problema con el asiento, equipaje, servicio distinto al ofrecido.',
  },
  {
    valor: 'QUEJA',
    titulo: 'Queja',
    Icono: IconoQueja,
    descripcion: 'Malestar por la atención recibida, no ligado al servicio contratado.',
    ejemplos: 'Mala atención, trato inadecuado, falta de información, conducta de un trabajador.',
  },
]

export function PasoReclamacion({ formulario, cambiar, errores }) {
  return (
    <div className="libro-campos">
      <fieldset className="libro-tipos" aria-describedby={errores.tipoRequerimiento ? 'libro-tipo-error' : undefined}>
        <legend className="campo-texto__etiqueta">¿Qué deseas registrar?</legend>
        <div className="libro-tipos__rejilla">
          {TIPOS.map(({ valor, titulo, Icono, descripcion, ejemplos }) => (
            <label
              key={valor}
              className={`libro-tipo ${formulario.tipoRequerimiento === valor ? 'libro-tipo--activo' : ''}`}
            >
              <input
                type="radio"
                name="tipoRequerimiento"
                value={valor}
                checked={formulario.tipoRequerimiento === valor}
                onChange={() => cambiar('tipoRequerimiento', valor)}
                aria-invalid={errores.tipoRequerimiento ? 'true' : undefined}
              />
              <span className="libro-tipo__icono"><Icono /></span>
              <span className="libro-tipo__titulo">{titulo}</span>
              <span className="libro-tipo__descripcion">{descripcion}</span>
              <span className="libro-tipo__ejemplos">{ejemplos}</span>
            </label>
          ))}
        </div>
        {errores.tipoRequerimiento && (
          <span className="campo-texto__error" id="libro-tipo-error">{errores.tipoRequerimiento}</span>
        )}
      </fieldset>

      <div className="libro-campos__fila libro-campos__fila--completa">
        <CampoTexto
          etiqueta="Descripción del servicio involucrado"
          valor={formulario.descripcionServicio}
          alCambiar={(v) => cambiar('descripcionServicio', v)}
          error={errores.descripcionServicio}
          marcador="Ej.: viaje Trujillo – Lima, atención en ventanilla"
        />
      </div>
      <div className="libro-campos__fila">
        <CampoTexto
          etiqueta="Fecha del incidente"
          tipo="date"
          valor={formulario.fechaIncidente}
          alCambiar={(v) => cambiar('fechaIncidente', v)}
          error={errores.fechaIncidente}
        />
        <div className="libro-monto">
          <CampoTexto
            etiqueta="Monto reclamado (opcional)"
            valor={formulario.montoReclamado}
            alCambiar={(v) => cambiar('montoReclamado', v)}
            error={errores.montoReclamado}
            modoEntrada="decimal"
            marcador="0.00"
          />
          <CampoSeleccion
            etiqueta="Moneda"
            valor={formulario.moneda}
            alCambiar={(v) => cambiar('moneda', v)}
            opciones={[{ valor: 'PEN', texto: 'PEN (S/)' }, { valor: 'USD', texto: 'USD ($)' }]}
          />
        </div>
      </div>
      <CampoArea
        etiqueta="Detalle de los hechos"
        valor={formulario.detalleHechos}
        alCambiar={(v) => cambiar('detalleHechos', v)}
        maximo={LIMITES.detalle.max}
        minimo={LIMITES.detalle.min}
        error={errores.detalleHechos}
        ayuda="Indica qué ocurrió, cuándo y dónde, con el mayor detalle posible."
        filas={6}
      />
      <CampoArea
        etiqueta="¿Qué solución esperas obtener?"
        valor={formulario.pedidoConsumidor}
        alCambiar={(v) => cambiar('pedidoConsumidor', v)}
        maximo={LIMITES.pedido.max}
        minimo={LIMITES.pedido.min}
        error={errores.pedidoConsumidor}
        ayuda="Por ejemplo: devolución del dinero, compensación, corrección del servicio o mejora en la atención."
        filas={4}
      />
    </div>
  )
}
