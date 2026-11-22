import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { IconoAyuda } from './IconoAyuda'
import { PANTALLAS, SELECTORES } from './PantallasDemo'
import './visorDemo.css'

const ALTO = 480
const ANCHO_AMPLIO = 760
const ANCHO_ESTRECHO = 520
const RESERVA_VERTICAL = 410
const MS_CAMARA = 720
const MS_VIAJE = 900
const MS_TECLA = 55

function aplicar(estado, parte) {
  if (!parte) return estado
  const { campos, ...resto } = parte
  return { ...estado, ...resto, campos: campos ? { ...estado.campos, ...campos } : estado.campos }
}

function estadoDeEscena(escena, aplicado, escrito) {
  let estado = aplicar({}, escena.inicial)
  if (aplicado) estado = aplicar(estado, escena.estado)
  if (escena.escribir && escrito !== null) estado = aplicar(estado, { campos: { [escena.escribir.campo]: escrito } })
  return estado
}

function estadoAcumulado(escenas, indice, aplicado, escrito) {
  let estado = {}
  for (let i = 0; i < indice; i += 1) {
    const previa = escenas[i]
    estado = aplicar(estado, previa.inicial)
    estado = aplicar(estado, previa.estado)
    if (previa.escribir) estado = aplicar(estado, { campos: { [previa.escribir.campo]: previa.escribir.texto } })
  }
  return aplicar(estado, estadoDeEscena(escenas[indice], aplicado, escrito))
}

function resolver(raiz, pantalla, foco) {
  if (!raiz || !foco) return null
  if (foco.startsWith('css:')) return raiz.querySelector(foco.slice(4))
  return raiz.querySelector(`[data-demo="${foco}"]`) ?? raiz.querySelector(SELECTORES[pantalla]?.[foco] ?? '[data-sin-objetivo]')
}

function cajaLogica(elemento, pantalla) {
  let lx = 0
  let ly = 0
  for (let actual = elemento; actual && actual !== pantalla; actual = actual.offsetParent) {
    lx += actual.offsetLeft
    ly += actual.offsetTop
  }
  return { lx, ly, lw: elemento.offsetWidth, lh: elemento.offsetHeight }
}

function estadoInicial(clave, escena) {
  return {
    clave,
    objetivo: null,
    cursor: null,
    aplicado: !escena.accion || escena.accion === 'ninguna',
    escrito: escena.escribir ? '' : null,
    fase: 'moviendo',
  }
}

function limitar(valor, minimo, maximo) {
  return Math.min(Math.max(valor, minimo), maximo)
}

function useMovimientoReducido() {
  const [reducido, setReducido] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    const alCambiar = () => setReducido(consulta.matches)
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])
  return reducido
}

export function VisorDemo({ tutorial, escenaInicial = 0, categoria, alCerrar, alEjecutarAccion }) {
  const escenas = tutorial.escenas
  const reducido = useMovimientoReducido()
  const [indice, setIndice] = useState(() => limitar(escenaInicial, 0, escenas.length - 1))
  const [reproduciendo, setReproduciendo] = useState(!reducido)
  const [camara, setCamara] = useState({ z: 1, x: 0, y: 0, salto: true })
  const movimientoHasta = useRef(0)
  const [clics, setClics] = useState(0)
  const [reinicios, setReinicios] = useState(0)
  const [medidas, setMedidas] = useState({ ancho: 760, escala: 1, marco: 760 })
  const zonaRef = useRef(null)
  const marcoRef = useRef(null)
  const pantallaRef = useRef(null)
  const camaraRef = useRef(camara)
  const anteriorRef = useRef(null)

  const escena = escenas[indice]
  const clave = `${indice}-${reinicios}`
  const [seguimiento, setSeguimiento] = useState({ clave: '' })
  const vigente = seguimiento.clave === clave ? seguimiento : estadoInicial(clave, escena)
  const { aplicado, escrito, fase, objetivo, cursor, sinObjetivo } = vigente
  const Pantalla = PANTALLAS[escena.pantalla]
  const estado = useMemo(() => estadoAcumulado(escenas, indice, aplicado, escrito), [escenas, indice, aplicado, escrito])
  const ultima = indice === escenas.length - 1
  const terminado = ultima && fase === 'listo'

  useLayoutEffect(() => {
    const zona = zonaRef.current
    const calcular = () => {
      const disponible = zona.clientWidth
      const logico = disponible < 560 ? ANCHO_ESTRECHO : ANCHO_AMPLIO
      const porAlto = Math.max(0.6, (window.innerHeight - RESERVA_VERTICAL) / ALTO)
      const escala = Math.min(disponible / logico, porAlto)
      setMedidas((previo) =>
        previo.ancho === logico && Math.abs(previo.escala - escala) < 0.001 ? previo : { ancho: logico, escala, marco: logico * escala },
      )
    }
    const observador = new ResizeObserver(calcular)
    observador.observe(zona)
    window.addEventListener('resize', calcular)
    calcular()
    return () => {
      observador.disconnect()
      window.removeEventListener('resize', calcular)
    }
  }, [])

  useEffect(() => {
    pantallaRef.current?.setAttribute('inert', '')
  })

  useEffect(() => {
    camaraRef.current = camara
  }, [camara])

  const medir = useCallback(() => {
    const marco = marcoRef.current
    const elemento = resolver(pantallaRef.current, escena.pantalla, escena.foco)
    if (!marco || !elemento) return null
    const { lx, ly, lw, lh } = cajaLogica(elemento, pantallaRef.current)
    const { z, x, y } = camaraRef.current
    const { escala } = medidas
    const izquierda = Math.max(0, (lx * z + x) * escala)
    const arriba = Math.max(0, (ly * z + y) * escala)
    const derecha = Math.min(marco.clientWidth, ((lx + lw) * z + x) * escala)
    const abajo = Math.min(marco.clientHeight, ((ly + lh) * z + y) * escala)
    return { x: izquierda, y: arriba, w: Math.max(0, derecha - izquierda), h: Math.max(0, abajo - arriba) }
  }, [escena, medidas])

  useEffect(() => {
    const temporizadores = []
    const esperar = (ms, accion) => {
      if (reducido || ms === 0) accion()
      else temporizadores.push(setTimeout(accion, ms))
    }
    const cambioPantalla = anteriorRef.current !== escena.pantalla
    anteriorRef.current = escena.pantalla
    setSeguimiento(estadoInicial(clave, escena))
    const poner = (cambio) => setSeguimiento((previo) => (previo.clave === clave ? { ...previo, ...cambio } : previo))

    const colocarCamara = () => {
      const marco = marcoRef.current
      const pantalla = pantallaRef.current
      const elemento = resolver(pantalla, escena.pantalla, escena.foco)
      if (!marco || !pantalla || !elemento) return 80
      const { ancho } = medidas
      const actual = camaraRef.current
      const { lx, ly, lw, lh } = cajaLogica(elemento, pantalla)
      const z = escena.zoom ?? (lw < 190 && lh < 90 ? 1.3 : 1)
      const total = Math.max(pantalla.scrollHeight, ly + lh + 24)
      const cx = lx + lw / 2
      const cy = ly + lh / 2
      const x = z === 1 ? 0 : limitar(ancho / 2 - cx * z, ancho - ancho * z, 0)
      const visible = ly >= 0 && ly + lh <= ALTO - 16
      const alineadoArriba = lh * z > ALTO - 48
      const deseado = z === 1 && visible ? 0 : alineadoArriba ? 24 - ly * z : ALTO / 2 - cy * z
      const y = limitar(deseado, Math.min(0, ALTO - total * z), 0)
      const cambio = Math.abs(actual.z - z) > 0.01 || Math.abs(actual.x - x) > 1 || Math.abs(actual.y - y) > 1
      camaraRef.current = { z, x, y }
      setCamara({ z, x, y, salto: cambioPantalla })
      if (cambio && !cambioPantalla && !reducido) movimientoHasta.current = Date.now() + MS_CAMARA
      return Math.max(80, movimientoHasta.current - Date.now())
    }

    const mostrar = () => {
      const caja = medir()
      if (!caja) {
        poner({ fase: 'listo' })
        return
      }
      poner({ objetivo: caja, cursor: { x: caja.x + caja.w * 0.3, y: caja.y + caja.h + 40 } })
      esperar(30, () => poner({ cursor: { x: caja.x + caja.w * 0.55, y: caja.y + caja.h * 0.6 } }))
      esperar(MS_VIAJE, () => {
        if (escena.accion === 'clic') {
          setClics((n) => n + 1)
          poner({ aplicado: true })
          temporizadores.push(
            setTimeout(() => {
              const nueva = medir()
              poner(nueva ? { objetivo: nueva } : { sinObjetivo: true })
            }, 80),
          )
          esperar(450, () => poner({ fase: 'listo' }))
        } else if (escena.accion === 'escribir') {
          const texto = escena.escribir.texto
          for (let i = 1; i <= texto.length; i += 1) {
            esperar(i * MS_TECLA, () => poner({ escrito: texto.slice(0, i) }))
          }
          esperar(texto.length * MS_TECLA + 350, () => poner({ fase: 'listo' }))
        } else {
          esperar(350, () => poner({ fase: 'listo' }))
        }
      })
    }

    esperar(60, () => {
      temporizadores.push(setTimeout(mostrar, colocarCamara()))
    })
    return () => temporizadores.forEach(clearTimeout)
  }, [escena, reinicios, reducido, medidas, medir])

  const siguiente = useCallback(() => setIndice((i) => Math.min(i + 1, escenas.length - 1)), [escenas.length])
  const anterior = useCallback(() => setIndice((i) => Math.max(i - 1, 0)), [])

  useEffect(() => {
    if (!reproduciendo || fase !== 'listo') return undefined
    if (ultima) {
      setReproduciendo(false)
      return undefined
    }
    const espera = Math.max(1800, 900 + escena.texto.length * 40)
    const id = setTimeout(siguiente, reducido ? 0 : espera)
    return () => clearTimeout(id)
  }, [reproduciendo, fase, ultima, escena, siguiente, reducido])

  const reiniciar = () => {
    setIndice(0)
    setReinicios((n) => n + 1)
    setReproduciendo(!reducido)
  }

  const alternar = () => {
    if (terminado) {
      reiniciar()
      return
    }
    setReproduciendo((valor) => !valor)
  }

  const manejarTecla = (evento) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(evento.target.tagName)) return
    if (evento.key === 'ArrowRight') {
      evento.preventDefault()
      siguiente()
    } else if (evento.key === 'ArrowLeft') {
      evento.preventDefault()
      anterior()
    }
  }

  const { ancho, escala, marco } = medidas
  const etiquetaAbajo = objetivo && objetivo.y < 96 && marco && ALTO * escala - (objetivo.y + objetivo.h) >= 96
  const etiquetaDentro = objetivo && objetivo.y < 96 && !etiquetaAbajo
  const estiloEtiqueta = objetivo
    ? {
        left: limitar(objetivo.x + objetivo.w / 2 - 140, 8, Math.max(8, marco - 288)),
        ...(etiquetaDentro
          ? { top: objetivo.y + 8 }
          : etiquetaAbajo
            ? { top: objetivo.y + objetivo.h + 14 }
            : { bottom: ALTO * escala - objetivo.y + 14 }),
      }
    : null
  const progreso = ((indice + 1) / escenas.length) * 100

  return (
    <div className="visor-demo" ref={zonaRef} onKeyDown={manejarTecla}>
      <div className="visor-demo__cabecera">
        <div className="visor-demo__titulos">
          <span className="visor-demo__migas">{categoria?.etiqueta}</span>
          <h3 className="visor-demo__titulo" tabIndex={-1}>{tutorial.titulo}</h3>
          <span className="visor-demo__sello">Simulación: no se realiza ninguna operación real</span>
        </div>
        <span className="visor-demo__insignia">Demostración</span>
      </div>

      <div
        className={`visor-demo__marco${reducido ? ' visor-demo__marco--quieto' : ''}`}
        ref={marcoRef}
        style={{ height: ALTO * escala, width: marco }}
      >
        <div className="visor-demo__escenario" style={{ width: ancho, height: ALTO, transform: `scale(${escala})` }}>
          <div
            className={`visor-demo__camara${camara.salto ? ' visor-demo__camara--salto' : ''}`}
            style={{ transform: `translate(${camara.x}px, ${camara.y}px) scale(${camara.z})` }}
          >
            <div
              key={`${escena.pantalla}-${reinicios}`}
              ref={pantallaRef}
              className={`visor-demo__pantalla visor-demo__pantalla--${escena.pantalla}`}
              style={{ width: ancho, minHeight: ALTO }}
              aria-hidden="true"
            >
              <Pantalla e={estado} />
            </div>
          </div>
        </div>

        {objetivo && (
          <>
            {!sinObjetivo && (
              <div
                className="visor-demo__foco"
                key={`foco-${clave}`}
                style={{ left: objetivo.x - 6, top: objetivo.y - 6, width: objetivo.w + 12, height: objetivo.h + 12 }}
              />
            )}
            <div className="visor-demo__etiqueta" style={estiloEtiqueta} key={`etiqueta-${clave}`}>
              <span className="visor-demo__numero">{indice + 1}</span>
              <p className="visor-demo__texto">{escena.texto}</p>
            </div>
          </>
        )}
        {cursor && (
          <span className="visor-demo__cursor" key={`cursor-${clave}`} style={{ left: cursor.x, top: cursor.y }}>
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 3l14 8-6 1.8L10.5 19 5 3z" fill="#fff" stroke="#0b2a33" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            {clics > 0 && <span key={clics} className="visor-demo__ondas" />}
          </span>
        )}
      </div>

      <p className="visor-demo__lector" role="status" aria-live="polite">
        Paso {indice + 1} de {escenas.length}: {escena.texto}
      </p>

      <div className="visor-demo__base">
        <div className="visor-demo__progreso" role="progressbar" aria-valuemin={1} aria-valuemax={escenas.length} aria-valuenow={indice + 1} aria-label="Progreso de la demostración">
          <span style={{ width: `${progreso}%` }} />
        </div>

        <div className="visor-demo__controles">
          <span className="visor-demo__paso">
            Paso {indice + 1} de {escenas.length}
          </span>
          <div className="visor-demo__botones">
            <button type="button" className="visor-demo__boton" onClick={anterior} disabled={indice === 0}>
              <IconoAyuda nombre="atras" tamano={18} />
              Anterior
            </button>
            <button type="button" className="visor-demo__boton visor-demo__boton--principal" onClick={alternar}>
              <IconoAyuda nombre={terminado ? 'reiniciar' : reproduciendo ? 'pausa' : 'reproducir'} tamano={18} />
              {terminado ? 'Repetir' : reproduciendo ? 'Pausar' : 'Reproducir'}
            </button>
            <button type="button" className="visor-demo__boton" onClick={siguiente} disabled={ultima}>
              Siguiente
              <IconoAyuda nombre="siguiente" tamano={18} />
            </button>
            <button type="button" className="visor-demo__boton" onClick={reiniciar}>
              <IconoAyuda nombre="reiniciar" tamano={18} />
              Reiniciar
            </button>
          </div>
        </div>

        <div className="visor-demo__pie">
          <button type="button" className="visor-demo__cerrar" onClick={alCerrar}>
            <IconoAyuda nombre="cerrar" tamano={16} />
            Cerrar demostración
          </button>
          {tutorial.accion && (
            <button type="button" className="visor-demo__accion" onClick={() => alEjecutarAccion(tutorial.accion)}>
              {tutorial.accion.etiqueta}
              <IconoAyuda nombre="siguiente" tamano={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
