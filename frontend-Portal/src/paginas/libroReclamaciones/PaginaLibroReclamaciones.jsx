import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BotonPrincipal } from '../../componentes/comunes/BotonPrincipal'
import { BotonSecundario } from '../../componentes/comunes/BotonSecundario'
import { ConfirmacionReclamo } from '../../componentes/libroReclamaciones/ConfirmacionReclamo'
import { PasoDatosPersonales, PasoReclamacion, PasoServicio } from '../../componentes/libroReclamaciones/PasosReclamo'
import { PasoRevision } from '../../componentes/libroReclamaciones/PasoRevision'
import { IconoAlerta, IconoEdificio, IconoEscudo, IconoLibro, IconoReloj } from '../../componentes/libroReclamaciones/iconosLibro'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import {
  consultarReclamo,
  guardarReclamoReciente,
  leerReclamoReciente,
  obtenerProveedor,
  olvidarReclamoReciente,
  registrarReclamo,
} from '../../servicios/reclamosServicio'
import { listarCompras } from '../../servicios/comprasServicio'
import { formatearFechaCorta } from '../../utilidades/formato'
import {
  PASOS,
  construirPayload,
  crearFormularioInicial,
  validarPaso,
  validarTodo,
} from '../../utilidades/validarReclamo'
import './paginaLibroReclamaciones.css'

const TITULOS_PASO = [
  { titulo: 'Tus datos personales', texto: 'Necesitamos identificarte para registrar y responder tu requerimiento.' },
  { titulo: 'Servicio de transporte', texto: 'Cuéntanos a qué servicio se refiere. Si tienes una compra en tu cuenta, puedes elegirla.' },
  { titulo: 'Tu reclamo o queja', texto: 'Describe lo ocurrido y la solución que esperas.' },
  { titulo: 'Revisa y envía', texto: 'Confirma que toda la información sea correcta.' },
]

function generarClave() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function pasajesDeCompras(compras) {
  return compras.flatMap((compra) =>
    (compra.boletos ?? [])
      .filter((boleto) => boleto.idPasaje)
      .map((boleto) => ({
        idPasaje: boleto.idPasaje,
        numeroBoleto: boleto.numeroBoleto,
        origen: compra.origen ?? '—',
        destino: compra.destino ?? '—',
        fechaSalida: compra.fechaSalida,
        asiento: boleto.asiento,
        etiqueta: `${boleto.numeroBoleto} · ${compra.origen ?? '—'} → ${compra.destino ?? '—'}${
          compra.fechaSalida ? ` · ${formatearFechaCorta(compra.fechaSalida)}` : ''
        }`,
      })),
  )
}

export function PaginaLibroReclamaciones() {
  const { usuario, estaAutenticado, cargandoSesion } = useAutenticacion()
  const [paso, setPaso] = useState(0)
  const [formulario, setFormulario] = useState(crearFormularioInicial)
  const [errores, setErrores] = useState({})
  const [proveedor, setProveedor] = useState(null)
  const [pasajes, setPasajes] = useState([])
  const [cargandoPasajes, setCargandoPasajes] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [recuperando, setRecuperando] = useState(() => Boolean(leerReclamoReciente()))
  const clave = useRef(generarClave())
  const bloqueo = useRef(false)
  const prellenado = useRef(false)
  const tarjeta = useRef(null)

  useEffect(() => {
    let activo = true
    obtenerProveedor().then((datos) => activo && setProveedor(datos)).catch(() => activo && setProveedor({}))
    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    const reciente = leerReclamoReciente()
    if (!reciente) return undefined
    let activo = true
    consultarReclamo(reciente.codigo, reciente.token)
      .then((constancia) => activo && setResultado({ constancia, token: reciente.token }))
      .catch(() => olvidarReclamoReciente())
      .finally(() => activo && setRecuperando(false))
    return () => {
      activo = false
    }
  }, [])

  useEffect(() => {
    if (!usuario || prellenado.current) return
    prellenado.current = true
    setFormulario((actual) => ({
      ...actual,
      nombresCompletos: actual.nombresCompletos || `${usuario.nombres ?? ''} ${usuario.apellidos ?? ''}`.trim(),
      correo: actual.correo || usuario.correo || '',
      telefono: actual.telefono || usuario.telefono || '',
    }))
  }, [usuario])

  useEffect(() => {
    if (!estaAutenticado) {
      setPasajes([])
      return undefined
    }
    let activo = true
    setCargandoPasajes(true)
    listarCompras()
      .then((datos) => activo && setPasajes(pasajesDeCompras(datos.compras)))
      .catch(() => activo && setPasajes([]))
      .finally(() => activo && setCargandoPasajes(false))
    return () => {
      activo = false
    }
  }, [estaAutenticado])

  const cambiar = useCallback((campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }))
    setErrores((actual) => {
      if (!actual[campo]) return actual
      const { [campo]: _omitido, ...resto } = actual
      return resto
    })
  }, [])

  const elegirPasaje = (valor) => {
    const elegido = pasajes.find((p) => String(p.idPasaje) === String(valor))
    setFormulario((actual) => ({
      ...actual,
      idPasaje: valor,
      ...(elegido ? { servicioInvolucrado: 'Transporte terrestre de pasajeros' } : {}),
    }))
  }

  const pasajeElegido = useMemo(
    () => pasajes.find((p) => String(p.idPasaje) === String(formulario.idPasaje)) ?? null,
    [pasajes, formulario.idPasaje],
  )

  const enfocarPrimerError = () => {
    window.setTimeout(() => {
      const invalido = tarjeta.current?.querySelector('[aria-invalid="true"]')
      invalido?.focus()
    }, 30)
  }

  const irAlPaso = (destino) => {
    setPaso(destino)
    setErrorEnvio(null)
    window.setTimeout(() => tarjeta.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  const continuar = () => {
    const encontrados = validarPaso(paso, formulario)
    setErrores(encontrados)
    if (Object.keys(encontrados).length > 0) {
      enfocarPrimerError()
      return
    }
    irAlPaso(paso + 1)
  }

  const enviar = async () => {
    if (bloqueo.current) return
    const problema = validarTodo(formulario)
    if (problema) {
      setErrores(problema.errores)
      if (problema.paso !== paso) irAlPaso(problema.paso)
      enfocarPrimerError()
      return
    }
    bloqueo.current = true
    setEnviando(true)
    setErrorEnvio(null)
    try {
      const respuesta = await registrarReclamo(construirPayload(formulario, clave.current))
      guardarReclamoReciente(respuesta.constancia.codigo, respuesta.tokenConsulta)
      setResultado({ constancia: respuesta.constancia, token: respuesta.tokenConsulta })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErrorEnvio({ mensaje: error.message, detalles: error.detalles ?? [] })
    } finally {
      bloqueo.current = false
      setEnviando(false)
    }
  }

  const registrarOtra = () => {
    olvidarReclamoReciente()
    clave.current = generarClave()
    prellenado.current = false
    setResultado(null)
    setFormulario(crearFormularioInicial())
    setErrores({})
    setPaso(0)
    if (usuario) {
      prellenado.current = true
      setFormulario((actual) => ({
        ...actual,
        nombresCompletos: `${usuario.nombres ?? ''} ${usuario.apellidos ?? ''}`.trim(),
        correo: usuario.correo || '',
        telefono: usuario.telefono || '',
      }))
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const ultimoPaso = paso === PASOS.length - 1
  const encabezadoPaso = TITULOS_PASO[paso]
  const datosProveedor = [
    ['Razón social', proveedor?.razonSocial],
    ['RUC', proveedor?.ruc],
    ['Dirección', proveedor?.direccion],
    ['Teléfono', proveedor?.telefono],
    ['Correo', proveedor?.correo],
  ].filter(([, valor]) => valor)

  return (
    <div className="libro">
      <header className="libro-hero">
        <div className="contenedor libro-hero__contenido">
          <span className="libro-hero__icono"><IconoLibro width={28} height={28} /></span>
          <div>
            <h1 className="libro-hero__titulo">Libro de Reclamaciones</h1>
            <p className="libro-hero__texto">
              En RutaLibre nos comprometemos a brindar un servicio de transporte seguro y de calidad. Si tienes alguna
              disconformidad con nuestros servicios o con la atención recibida, ponemos a tu disposición nuestro Libro de
              Reclamaciones virtual.
            </p>
            <p className="libro-hero__plazo">
              <IconoReloj width={18} height={18} />
              Plazo máximo de respuesta: 15 días hábiles improrrogables.
            </p>
          </div>
        </div>
      </header>

      <div className="contenedor libro-cuerpo">
        <div className="libro-principal">
          {recuperando ? (
            <div className="libro-tarjeta libro-cargando" role="status">Recuperando tu constancia…</div>
          ) : resultado ? (
            <div className="libro-tarjeta animar-aparicion">
              <ConfirmacionReclamo constancia={resultado.constancia} proveedor={proveedor} alRegistrarOtra={registrarOtra} />
            </div>
          ) : (
            <form
              ref={tarjeta}
              className="libro-tarjeta"
              onSubmit={(evento) => {
                evento.preventDefault()
                if (ultimoPaso) enviar()
                else continuar()
              }}
              noValidate
            >
              <ol className="libro-pasos" aria-label="Progreso del formulario">
                {PASOS.map((nombre, indice) => (
                  <li
                    key={nombre}
                    className={`libro-paso ${indice === paso ? 'libro-paso--actual' : ''} ${indice < paso ? 'libro-paso--hecho' : ''}`}
                    aria-current={indice === paso ? 'step' : undefined}
                  >
                    <span className="libro-paso__numero">{indice < paso ? '✓' : indice + 1}</span>
                    <span className="libro-paso__nombre">{nombre}</span>
                  </li>
                ))}
              </ol>
              <div className="libro-progreso" aria-hidden="true">
                <span style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }} />
              </div>

              <div className="libro-seccion" key={paso}>
                <h2 className="libro-seccion__titulo">{encabezadoPaso.titulo}</h2>
                <p className="libro-seccion__texto">{encabezadoPaso.texto}</p>

                {paso === 0 && (
                  <PasoDatosPersonales
                    formulario={formulario}
                    cambiar={cambiar}
                    errores={errores}
                    sesionIniciada={estaAutenticado && !cargandoSesion}
                  />
                )}
                {paso === 1 && (
                  <PasoServicio
                    formulario={formulario}
                    cambiar={cambiar}
                    errores={errores}
                    pasajes={pasajes}
                    cargandoPasajes={cargandoPasajes}
                    alElegirPasaje={elegirPasaje}
                  />
                )}
                {paso === 2 && <PasoReclamacion formulario={formulario} cambiar={cambiar} errores={errores} />}
                {paso === 3 && (
                  <PasoRevision
                    formulario={formulario}
                    cambiar={cambiar}
                    errores={errores}
                    pasajeElegido={pasajeElegido}
                    alEditar={irAlPaso}
                  />
                )}
              </div>

              {errorEnvio && (
                <div className="libro-error-envio" role="alert">
                  <IconoAlerta />
                  <div>
                    <strong>{errorEnvio.mensaje}</strong>
                    {errorEnvio.detalles.length > 0 && (
                      <ul>{errorEnvio.detalles.map((detalle) => <li key={detalle}>{detalle}</li>)}</ul>
                    )}
                  </div>
                </div>
              )}

              <div className="libro-acciones">
                {paso > 0 ? (
                  <BotonSecundario onClick={() => irAlPaso(paso - 1)} deshabilitado={enviando}>
                    Anterior
                  </BotonSecundario>
                ) : (
                  <span />
                )}
                <BotonPrincipal tipo="submit" cargando={enviando} deshabilitado={enviando}>
                  {ultimoPaso ? (enviando ? 'Enviando…' : 'Enviar reclamación') : 'Continuar'}
                </BotonPrincipal>
              </div>
            </form>
          )}
        </div>

        <aside className="libro-lateral">
          <section className="libro-tarjeta libro-tarjeta--lateral">
            <h2 className="libro-lateral__titulo"><IconoEdificio width={20} height={20} /> Datos del proveedor</h2>
            {datosProveedor.length > 0 ? (
              <dl className="libro-datos libro-datos--apilado">
                {datosProveedor.map(([etiqueta, valor]) => (
                  <div key={etiqueta}><dt>{etiqueta}</dt><dd>{valor}</dd></div>
                ))}
              </dl>
            ) : (
              <p className="libro-nota">Cargando datos del proveedor…</p>
            )}
          </section>
          <section className="libro-tarjeta libro-tarjeta--lateral">
            <h2 className="libro-lateral__titulo"><IconoEscudo width={20} height={20} /> Cómo funciona</h2>
            <ol className="libro-lista">
              <li>Completas el formulario; no necesitas una cuenta.</li>
              <li>Recibes un código de reclamación y tu constancia en PDF.</li>
              <li>La empresa responde en el correo que indicaste en un máximo de 15 días hábiles.</li>
            </ol>
            <p className="libro-nota">Tus datos personales se usan solo para atender tu requerimiento.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}
