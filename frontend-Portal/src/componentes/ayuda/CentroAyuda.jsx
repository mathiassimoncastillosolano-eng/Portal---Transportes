import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ACCIONES_CONTEXTUALES, CATEGORIAS, GALERIA, PREGUNTAS, TUTORIALES } from '../../datos/ayuda'
import { CONTACTO } from '../../datos/contacto'
import { buscarAyuda } from '../../utilidades/buscarAyuda'
import { BuscadorAyuda } from './BuscadorAyuda'
import { GaleriaAyuda } from './GaleriaAyuda'
import { IconoAyuda } from './IconoAyuda'
import { ListaPreguntas } from './ListaPreguntas'
import { ListaTutoriales } from './ListaTutoriales'
import { NavegacionAyuda } from './NavegacionAyuda'
import './centroAyuda.css'

const VisorDemo = lazy(() => import('./VisorDemo').then((modulo) => ({ default: modulo.VisorDemo })))

const SELECTOR_FOCO = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
const SUGERENCIAS = ['¿Dónde están mis boletos?', 'Quiero descargar mi pasaje', 'Necesito cambiar mi fecha']

function estadoInicial(destino) {
  const base = { categoria: null, tutorial: null, escena: 0 }
  const pregunta = PREGUNTAS.find((item) => item.id === destino?.pregunta)
  const tutorial = TUTORIALES.find((item) => item.id === (destino?.tutorial ?? pregunta?.tutorial))
  if (tutorial) return { categoria: tutorial.categoria, tutorial: tutorial.id, escena: destino?.escena ?? pregunta?.escena ?? 0 }
  if (CATEGORIAS.some((item) => item.id === destino?.categoria)) return { ...base, categoria: destino.categoria }
  return base
}

function ContenidoCentroAyuda({ destino, estaAutenticado, alCerrar, alEjecutarAccion }) {
  const [vista, setVista] = useState(() => estadoInicial(destino))
  const [consulta, setConsulta] = useState('')
  const raiz = useRef(null)
  const panel = useRef(null)
  const titulo = useRef(null)
  const contenido = useRef(null)
  const buscador = useRef(null)

  const categoriaActiva = CATEGORIAS.find((item) => item.id === vista.categoria) ?? null
  const tutorialActivo = TUTORIALES.find((item) => item.id === vista.tutorial) ?? null
  const textoBusqueda = consulta.trim()

  const resultados = useMemo(
    () => (textoBusqueda ? buscarAyuda(textoBusqueda, { categorias: CATEGORIAS, guias: TUTORIALES, preguntas: PREGUNTAS }) : null),
    [textoBusqueda],
  )

  useEffect(() => {
    const cuerpo = document.body
    const overflowPrevio = cuerpo.style.overflow
    cuerpo.style.overflow = 'hidden'
    const inertes = Array.from(cuerpo.children).filter(
      (nodo) => nodo !== raiz.current && !nodo.hasAttribute('inert') && !['SCRIPT', 'STYLE'].includes(nodo.tagName),
    )
    inertes.forEach((nodo) => nodo.setAttribute('inert', ''))
    titulo.current?.focus()

    const manejarTecla = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        alCerrar()
        return
      }
      if (evento.key !== 'Tab' || !panel.current) return
      const enfocables = Array.from(panel.current.querySelectorAll(SELECTOR_FOCO)).filter((nodo) => nodo.offsetParent !== null)
      if (!enfocables.length) return
      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]
      const activo = document.activeElement
      if (!panel.current.contains(activo)) {
        evento.preventDefault()
        primero.focus()
      } else if (evento.shiftKey && (activo === primero || activo === titulo.current)) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', manejarTecla)
    return () => {
      document.removeEventListener('keydown', manejarTecla)
      cuerpo.style.overflow = overflowPrevio
      inertes.forEach((nodo) => nodo.removeAttribute('inert'))
    }
  }, [alCerrar])

  useEffect(() => {
    contenido.current?.scrollTo({ top: 0 })
  }, [vista.categoria, vista.tutorial, textoBusqueda])

  const elegirCategoria = (id) => {
    setConsulta('')
    setVista({ categoria: id, tutorial: null, escena: 0 })
  }

  const abrirDemo = (id, escena = 0) => {
    const tutorial = TUTORIALES.find((item) => item.id === id)
    if (!tutorial) return
    setConsulta('')
    setVista({ categoria: tutorial.categoria, tutorial: id, escena })
  }

  const cerrarDemo = () => setVista((previo) => ({ ...previo, tutorial: null, escena: 0 }))
  const limpiarBusqueda = () => {
    setConsulta('')
    buscador.current?.focus()
  }

  const preguntasDeCategoria = categoriaActiva ? PREGUNTAS.filter((item) => item.categoria === categoriaActiva.id) : []
  const tutorialesDeCategoria = categoriaActiva ? TUTORIALES.filter((item) => item.categoria === categoriaActiva.id) : []
  const relacionadas = tutorialActivo ? PREGUNTAS.filter((item) => item.tutorial === tutorialActivo.id || item.categoria === tutorialActivo.categoria).slice(0, 4) : []

  const lista = (preguntas, conCategoria) => (
    <ListaPreguntas preguntas={preguntas} tutoriales={TUTORIALES} categorias={CATEGORIAS} alAbrir={abrirDemo} conCategoria={conCategoria} />
  )

  const renderInicio = () => (
    <div className="centro-ayuda__vista">
      <div className="centro-ayuda__bienvenida">
        <span className="centro-ayuda__bienvenida-icono">
          <IconoAyuda nombre="ayuda" tamano={26} />
        </span>
        <div>
          <h3 className="centro-ayuda__vista-titulo">Descubre cómo utilizar RutaLibre</h3>
          <p className="centro-ayuda__vista-texto">
            Mira demostraciones animadas de la interfaz real. No se realiza ninguna operación y puedes verlas sin iniciar sesión.
          </p>
        </div>
      </div>

      <h4 className="centro-ayuda__seccion-titulo">Lo que más se consulta</h4>
      <GaleriaAyuda tarjetas={GALERIA} alAbrir={abrirDemo} />

      <h4 className="centro-ayuda__seccion-titulo">Explora por tema</h4>
      <ul className="centro-ayuda__categorias">
        {CATEGORIAS.map((categoria) => (
          <li key={categoria.id}>
            <button type="button" className="centro-ayuda__categoria-tarjeta" onClick={() => elegirCategoria(categoria.id)}>
              <span className="centro-ayuda__guia-icono">
                <IconoAyuda nombre={categoria.icono} />
              </span>
              <span className="centro-ayuda__guia-titulo">{categoria.etiqueta}</span>
              <span className="centro-ayuda__guia-resumen">{categoria.descripcion}</span>
            </button>
          </li>
        ))}
      </ul>

      <h4 className="centro-ayuda__seccion-titulo">Accesos directos</h4>
      <div className="centro-ayuda__acciones-rapidas">
        {ACCIONES_CONTEXTUALES.map((accion) => (
          <button key={accion.id} type="button" className="centro-ayuda__boton centro-ayuda__boton--secundario" onClick={() => alEjecutarAccion(accion)}>
            <IconoAyuda nombre={accion.icono} tamano={16} />
            {accion.etiqueta}
          </button>
        ))}
      </div>

      <p className="centro-ayuda__contacto">
        ¿No encuentras lo que buscas? Escríbenos a <strong>{CONTACTO.correo}</strong> o llámanos al <strong>{CONTACTO.telefono}</strong>.{' '}
        {CONTACTO.horarioAtencion}.
      </p>
    </div>
  )

  const renderCategoria = () => (
    <div className="centro-ayuda__vista">
      <div className="centro-ayuda__bienvenida">
        <span className="centro-ayuda__bienvenida-icono">
          <IconoAyuda nombre={categoriaActiva.icono} tamano={26} />
        </span>
        <div>
          <h3 className="centro-ayuda__vista-titulo">{categoriaActiva.etiqueta}</h3>
          <p className="centro-ayuda__vista-texto">{categoriaActiva.descripcion}</p>
        </div>
      </div>
      <h4 className="centro-ayuda__seccion-titulo">Demostraciones</h4>
      <ListaTutoriales tutoriales={tutorialesDeCategoria} alAbrir={abrirDemo} estaAutenticado={estaAutenticado} />
      <h4 className="centro-ayuda__seccion-titulo">Preguntas frecuentes</h4>
      {lista(preguntasDeCategoria, false)}
    </div>
  )

  const renderBusqueda = () => {
    const total = resultados.guias.length + resultados.preguntas.length
    return (
      <div className="centro-ayuda__vista">
        <p className="centro-ayuda__resultados-resumen" role="status">
          {total > 0
            ? `${total} ${total === 1 ? 'resultado' : 'resultados'} para «${textoBusqueda}»`
            : `Sin resultados para «${textoBusqueda}»`}
        </p>

        {total === 0 && (
          <div className="centro-ayuda__vacio">
            <span className="centro-ayuda__bienvenida-icono">
              <IconoAyuda nombre="buscar" tamano={26} />
            </span>
            <h3 className="centro-ayuda__vista-titulo">No encontramos lo que buscas</h3>
            <p className="centro-ayuda__vista-texto">
              Prueba con otras palabras, por ejemplo «pago», «asientos», «perfil» o «cambio de viaje», o explora las demostraciones.
            </p>
            <div className="centro-ayuda__vacio-acciones">
              <button type="button" className="centro-ayuda__boton centro-ayuda__boton--secundario" onClick={limpiarBusqueda}>
                Borrar búsqueda
              </button>
              <button type="button" className="centro-ayuda__boton centro-ayuda__boton--principal" onClick={() => elegirCategoria(null)}>
                Ver todos los temas
              </button>
            </div>
            <h4 className="centro-ayuda__seccion-titulo">Quizá te interese</h4>
            <GaleriaAyuda tarjetas={GALERIA.slice(0, 4)} alAbrir={abrirDemo} />
          </div>
        )}

        {resultados.preguntas.length > 0 && (
          <>
            <h4 className="centro-ayuda__seccion-titulo">Preguntas</h4>
            {lista(resultados.preguntas, true)}
          </>
        )}
        {resultados.guias.length > 0 && (
          <>
            <h4 className="centro-ayuda__seccion-titulo">Demostraciones</h4>
            <ListaTutoriales tutoriales={resultados.guias} alAbrir={abrirDemo} estaAutenticado={estaAutenticado} />
          </>
        )}
      </div>
    )
  }

  const renderDemo = () => (
    <div className="centro-ayuda__vista">
      <Suspense fallback={<p className="centro-ayuda__vista-texto">Preparando la demostración…</p>}>
        <VisorDemo
          key={tutorialActivo.id}
          tutorial={tutorialActivo}
          escenaInicial={vista.escena}
          categoria={categoriaActiva}
          alCerrar={cerrarDemo}
          alEjecutarAccion={alEjecutarAccion}
        />
      </Suspense>
      {relacionadas.length > 0 && (
        <>
          <h4 className="centro-ayuda__seccion-titulo">Preguntas relacionadas</h4>
          {lista(relacionadas, false)}
        </>
      )}
    </div>
  )

  let central
  if (resultados) central = renderBusqueda()
  else if (tutorialActivo) central = renderDemo()
  else if (categoriaActiva) central = renderCategoria()
  else central = renderInicio()

  return (
    <div className="centro-ayuda__fondo" ref={raiz}>
      <div ref={panel} className="centro-ayuda__panel" role="dialog" aria-modal="true" aria-labelledby="centro-ayuda-titulo">
        <header className="centro-ayuda__cabecera">
          <div className="centro-ayuda__cabecera-titulo">
            <span className="centro-ayuda__marca">
              <IconoAyuda nombre="ayuda" tamano={22} />
            </span>
            <div>
              <h2 id="centro-ayuda-titulo" ref={titulo} tabIndex={-1} className="centro-ayuda__titulo">
                Centro de ayuda
              </h2>
              <p className="centro-ayuda__subtitulo">Aprende a usar RutaLibre con demostraciones</p>
            </div>
          </div>
          <BuscadorAyuda ref={buscador} valor={consulta} alCambiar={setConsulta} alLimpiar={limpiarBusqueda} />
          <button type="button" className="centro-ayuda__cerrar" onClick={() => alCerrar()} aria-label="Cerrar centro de ayuda">
            <IconoAyuda nombre="cerrar" tamano={20} />
          </button>
        </header>

        <div className="centro-ayuda__cuerpo">
          <aside className="centro-ayuda__lateral">
            <NavegacionAyuda categorias={CATEGORIAS} activa={vista.categoria} alElegir={elegirCategoria} />
          </aside>
          <section ref={contenido} className="centro-ayuda__contenido" aria-label="Contenido de ayuda">
            {!resultados && !tutorialActivo && (
              <ul className="centro-ayuda__sugerencias" aria-label="Búsquedas sugeridas">
                {SUGERENCIAS.map((texto) => (
                  <li key={texto}>
                    <button type="button" className="centro-ayuda__sugerencia" onClick={() => setConsulta(texto)}>
                      {texto}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {central}
          </section>
        </div>
      </div>
    </div>
  )
}

export function CentroAyuda({ abierto, destino, version, estaAutenticado, alCerrar, alEjecutarAccion }) {
  if (!abierto) return null
  return createPortal(
    <ContenidoCentroAyuda
      key={version}
      destino={destino}
      estaAutenticado={estaAutenticado}
      alCerrar={alCerrar}
      alEjecutarAccion={alEjecutarAccion}
    />,
    document.body,
  )
}
