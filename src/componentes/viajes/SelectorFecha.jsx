import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './selectorFecha.css'
import { fechaLocal } from '../../utilidades/fechas'

const ANCHO_CALENDARIO = 344
const ALTO_CALENDARIO = 410

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS_SEMANA = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function aFecha(iso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  return partes ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) : null
}

function primerDiaDelMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1)
}

function sumarDias(fecha, dias) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias)
}

function indiceMes(fecha) {
  return fecha.getFullYear() * 12 + fecha.getMonth()
}

function textoDisparador(fecha) {
  if (!fecha) return 'Selecciona una fecha'
  return fecha.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Selector de fecha con calendario propio. Mantiene el mismo contrato que el
 * <input type="date"> anterior: recibe/entrega "YYYY-MM-DD", no permite días
 * anteriores a hoy (igual que `min`) y publica el valor en un campo
 * `name="fecha"` para que el formulario siga leyéndolo con FormData.
 */
export function SelectorFecha({ etiqueta, valor, alCambiar }) {
  const hoy = fechaLocal()
  const fechaHoy = aFecha(hoy)
  const fechaValor = aFecha(valor)

  const [abierto, setAbierto] = useState(false)
  const [mesVisible, setMesVisible] = useState(() => primerDiaDelMes(fechaValor ?? fechaHoy))
  const [fechaFoco, setFechaFoco] = useState(() => fechaLocal(fechaValor && fechaValor >= fechaHoy ? fechaValor : fechaHoy))
  const [direccion, setDireccion] = useState('siguiente')
  const [posicion, setPosicion] = useState({ izquierda: 0, arriba: 0, abajo: 'auto' })
  const referencia = useRef(null)
  const capaRef = useRef(null)
  const disparadorRef = useRef(null)
  const debeEnfocar = useRef(false)

  // El calendario se dibuja en un portal (para que la hoja inferior móvil se
  // fije a la pantalla aunque algún contenedor tenga transformaciones) y en
  // escritorio se ancla al campo calculando su posición.
  function calcularPosicion() {
    const caja = referencia.current?.getBoundingClientRect()
    if (!caja) return
    const margen = 8
    const alineadoADerecha = window.innerWidth > 860
    const x = alineadoADerecha ? caja.right + 8 - ANCHO_CALENDARIO : caja.left - 8
    const izquierda = Math.max(margen, Math.min(x, window.innerWidth - ANCHO_CALENDARIO - margen))
    const debajo = caja.bottom + 16
    const cabeAbajo = debajo + ALTO_CALENDARIO <= window.innerHeight - margen
    const cabeArriba = caja.top - 16 - ALTO_CALENDARIO >= margen
    if (cabeAbajo || !cabeArriba) {
      setPosicion({ izquierda, arriba: debajo, abajo: 'auto' })
    } else {
      setPosicion({ izquierda, arriba: 'auto', abajo: window.innerHeight - caja.top + 16 })
    }
  }

  useEffect(() => {
    if (!abierto) return undefined
    calcularPosicion()

    function alPulsarFuera(evento) {
      const dentro = referencia.current?.contains(evento.target) || capaRef.current?.contains(evento.target)
      if (!dentro) setAbierto(false)
    }

    window.addEventListener('resize', calcularPosicion)
    window.addEventListener('scroll', calcularPosicion, true)
    document.addEventListener('mousedown', alPulsarFuera)
    return () => {
      window.removeEventListener('resize', calcularPosicion)
      window.removeEventListener('scroll', calcularPosicion, true)
      document.removeEventListener('mousedown', alPulsarFuera)
    }
  }, [abierto])

  // Enfoca el día activo cuando el movimiento viene del teclado o de la apertura.
  useEffect(() => {
    if (!abierto || !debeEnfocar.current) return
    debeEnfocar.current = false
    capaRef.current?.querySelector(`[data-fecha="${fechaFoco}"]`)?.focus()
  }, [abierto, fechaFoco, mesVisible])

  function abrir() {
    const base = fechaValor && fechaValor >= fechaHoy ? fechaValor : fechaHoy
    calcularPosicion()
    setMesVisible(primerDiaDelMes(base))
    setFechaFoco(fechaLocal(base))
    setDireccion('siguiente')
    debeEnfocar.current = true
    setAbierto(true)
  }

  function cerrar(devolverFoco = false) {
    setAbierto(false)
    if (devolverFoco) disparadorRef.current?.focus()
  }

  function elegir(fecha) {
    alCambiar(fechaLocal(fecha))
    cerrar(true)
  }

  function cambiarMes(delta) {
    const nuevo = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + delta, 1)
    if (indiceMes(nuevo) < indiceMes(fechaHoy)) return
    setDireccion(delta > 0 ? 'siguiente' : 'anterior')
    setMesVisible(nuevo)
    // Mantiene un día alcanzable con Tab dentro del mes visible.
    const candidato = fechaValor && indiceMes(fechaValor) === indiceMes(nuevo) ? fechaValor : nuevo
    setFechaFoco(fechaLocal(candidato < fechaHoy ? fechaHoy : candidato))
  }

  function moverFoco(nueva) {
    if (nueva < fechaHoy) return
    if (indiceMes(nueva) !== indiceMes(mesVisible)) {
      setDireccion(indiceMes(nueva) > indiceMes(mesVisible) ? 'siguiente' : 'anterior')
      setMesVisible(primerDiaDelMes(nueva))
    }
    setFechaFoco(fechaLocal(nueva))
    debeEnfocar.current = true
  }

  function manejarTeclado(evento) {
    if (evento.key === 'Escape') {
      evento.preventDefault()
      cerrar(true)
      return
    }
    const actual = aFecha(fechaFoco)
    if (!actual || !evento.target.dataset?.fecha) return
    const movimientos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (evento.key in movimientos) {
      evento.preventDefault()
      moverFoco(sumarDias(actual, movimientos[evento.key]))
    } else if (evento.key === 'PageDown' || evento.key === 'PageUp') {
      evento.preventDefault()
      const delta = evento.key === 'PageDown' ? 1 : -1
      const destino = new Date(actual.getFullYear(), actual.getMonth() + delta, 1)
      const ultimo = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate()
      moverFoco(new Date(destino.getFullYear(), destino.getMonth(), Math.min(actual.getDate(), ultimo)))
    } else if (evento.key === 'Home' || evento.key === 'End') {
      evento.preventDefault()
      const inicioSemana = (actual.getDay() + 6) % 7
      moverFoco(sumarDias(actual, evento.key === 'Home' ? -inicioSemana : 6 - inicioSemana))
    }
  }

  const anio = mesVisible.getFullYear()
  const mes = mesVisible.getMonth()
  const diasDelMes = new Date(anio, mes + 1, 0).getDate()
  const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7 // semana inicia en lunes
  const celdas = [...Array(desfase).fill(null), ...Array.from({ length: diasDelMes }, (_, i) => new Date(anio, mes, i + 1))]
  const puedeRetroceder = indiceMes(mesVisible) > indiceMes(fechaHoy)
  const nombreMes = MESES[mes]

  return (
    <div className="selector-fecha" ref={referencia}>
      <span className="selector-fecha__etiqueta">{etiqueta}</span>

      <input type="hidden" name="fecha" value={valor ?? ''} />

      <button
        type="button"
        ref={disparadorRef}
        className="selector-fecha__control"
        aria-label={`${etiqueta}: ${textoDisparador(fechaValor)}`}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onClick={() => (abierto ? cerrar() : abrir())}
      >
        <svg className="selector-fecha__icono" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="5.5" width="16" height="15" rx="2.4" stroke="currentColor" strokeWidth="1.7" />
          <path d="M4 9.5h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span className="selector-fecha__texto">{textoDisparador(fechaValor)}</span>
        <svg className="selector-fecha__chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="m3.5 5.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierto && createPortal(
        <div
          className="selector-fecha__capa"
          ref={capaRef}
          style={{
            '--cal-left': `${posicion.izquierda}px`,
            '--cal-top': typeof posicion.arriba === 'number' ? `${posicion.arriba}px` : 'auto',
            '--cal-bottom': typeof posicion.abajo === 'number' ? `${posicion.abajo}px` : 'auto',
          }}
        >
          <div className="selector-fecha__fondo" onClick={() => cerrar()} aria-hidden="true" />
          <div
            className="selector-fecha__calendario"
            role="dialog"
            aria-label={`Elegir ${etiqueta.toLowerCase()}`}
            onKeyDown={manejarTeclado}
          >
            <div className="selector-fecha__cabecera">
              <button
                type="button"
                className="selector-fecha__nav"
                onClick={() => cambiarMes(-1)}
                disabled={!puedeRetroceder}
                aria-label="Mes anterior"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <p className="selector-fecha__titulo" aria-live="polite">
                <span className="selector-fecha__mes">{nombreMes}</span>
                <span className="selector-fecha__anio">{anio}</span>
              </p>

              <button type="button" className="selector-fecha__nav" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="selector-fecha__cuerpo">
              <div className="selector-fecha__semana" aria-hidden="true">
                {DIAS_SEMANA.map((dia) => (
                  <span key={dia}>{dia}</span>
                ))}
              </div>

              <div
                key={`${anio}-${mes}`}
                className={`selector-fecha__dias selector-fecha__dias--${direccion}`}
                role="group"
                aria-label={`${nombreMes} de ${anio}`}
              >
                {celdas.map((fecha, indice) => {
                  if (!fecha) return <span key={`vacio-${indice}`} className="selector-fecha__vacio" aria-hidden="true" />
                  const iso = fechaLocal(fecha)
                  const noDisponible = fecha < fechaHoy
                  const seleccionado = iso === valor
                  const esHoy = iso === hoy
                  return (
                    <button
                      key={iso}
                      type="button"
                      data-fecha={iso}
                      className={[
                        'selector-fecha__dia',
                        seleccionado && 'selector-fecha__dia--seleccionado',
                        esHoy && 'selector-fecha__dia--hoy',
                        noDisponible && 'selector-fecha__dia--no-disponible',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={noDisponible}
                      tabIndex={iso === fechaFoco ? 0 : -1}
                      aria-pressed={seleccionado}
                      aria-current={esHoy ? 'date' : undefined}
                      aria-label={`${DIAS_LARGOS[fecha.getDay()]} ${fecha.getDate()} de ${nombreMes} de ${anio}${esHoy ? ', hoy' : ''}${noDisponible ? ', no disponible' : ''}`}
                      onClick={() => elegir(fecha)}
                    >
                      {fecha.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
