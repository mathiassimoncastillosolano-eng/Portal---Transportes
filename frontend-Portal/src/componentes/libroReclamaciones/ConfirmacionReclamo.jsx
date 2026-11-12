import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { BotonSecundario } from '../comunes/BotonSecundario'
import { formatearFechaLarga } from '../../utilidades/formato'
import { descargarConstanciaPdf } from '../../servicios/pdfConstanciaReclamo'
import { IconoCheck, IconoDescarga, IconoReloj } from './iconosLibro'

function fechaHora(iso) {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short', hour12: false })
}

export function ConfirmacionReclamo({ constancia, proveedor, alRegistrarOtra }) {
  const [descargando, setDescargando] = useState(false)
  const [errorPdf, setErrorPdf] = useState('')

  const descargar = async () => {
    setDescargando(true)
    setErrorPdf('')
    try {
      await descargarConstanciaPdf(constancia, proveedor ?? {})
    } catch {
      setErrorPdf('No pudimos generar el PDF. Inténtalo nuevamente.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <section className="libro-confirmacion" aria-labelledby="libro-confirmacion-titulo">
      <div className="libro-confirmacion__sello" aria-hidden="true">
        <IconoCheck width={34} height={34} />
      </div>
      <h2 id="libro-confirmacion-titulo" className="libro-confirmacion__titulo">
        Tu {constancia.tipoRequerimiento === 'QUEJA' ? 'queja' : 'reclamo'} fue registrado
      </h2>
      <p className="libro-confirmacion__texto">
        Guardamos tu hoja de reclamación. Conserva este código: lo necesitarás para cualquier seguimiento.
      </p>

      <div className="libro-confirmacion__codigo" role="status">
        <span>Código de reclamación</span>
        <strong>{constancia.codigo}</strong>
      </div>

      <dl className="libro-datos libro-datos--tarjeta">
        <div><dt>Fecha y hora de presentación</dt><dd>{fechaHora(constancia.fechaRegistro)}</dd></div>
        <div><dt>Tipo de requerimiento</dt><dd>{constancia.tipoRequerimiento === 'QUEJA' ? 'Queja' : 'Reclamo'}</dd></div>
        <div><dt>Consumidor</dt><dd>{constancia.consumidor.nombresCompletos}</dd></div>
        <div><dt>Correo de respuesta</dt><dd>{constancia.comunicacion.correoRespuesta}</dd></div>
      </dl>

      <div className="libro-plazo">
        <IconoReloj />
        <p>
          Recibirás la respuesta en el correo registrado a más tardar el{' '}
          <strong>{formatearFechaLarga(constancia.fechaLimiteRespuesta)}</strong> ({constancia.diasHabilesPlazo} días hábiles
          improrrogables).
        </p>
      </div>

      <div className="libro-confirmacion__acciones">
        <BotonPrincipal onClick={descargar} cargando={descargando} deshabilitado={descargando}>
          <IconoDescarga width={18} height={18} />
          {descargando ? 'Generando PDF…' : 'Descargar constancia en PDF'}
        </BotonPrincipal>
        <NavLink to="/" className="libro-enlace-boton">Volver al portal</NavLink>
        <BotonSecundario onClick={alRegistrarOtra}>Registrar otra reclamación</BotonSecundario>
      </div>
      {errorPdf && <p className="campo-texto__error libro-confirmacion__error" role="alert">{errorPdf}</p>}
      <p className="libro-nota">
        Descarga tu constancia ahora: es tu comprobante de presentación. Si cierras esta ventana podrás recuperarla mientras
        no cierres la pestaña del navegador.
      </p>
    </section>
  )
}
