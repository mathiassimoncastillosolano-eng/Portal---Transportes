import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import '../viajes/selectorFecha.css'
import './selectorFechaNacimiento.css'
import {
  ANIOS_POR_PAGINA, MESES, aIso, ajustarAlRango, anioEnRango, diasDelMes, estaEnRango,
  inicioPaginaAnios, leerIso, limitesNacimiento, mesEnRango, textoFecha,
} from '../../utilidades/fechaNacimiento'

const ANCHO = 344
const ALTO = 430
const DIAS_SEMANA = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']
const MESES_CORTOS = MESES.map((m) => m.slice(0, 3))

/**
 * Selector de fecha de nacimiento. Contrato idéntico al <input type="date">:
 * recibe y entrega "YYYY-MM-DD" (sin pasar por UTC). Tres vistas — años, meses y
 * días — para llegar a una fecha lejana en tres toques en vez de recorrer mes a mes.
 * Rango: de hoy − 120 años a hoy. La edad mínima para viajar se sigue validando
 * en validarPasajero.js (aquí solo se muestra el error recibido).
 */
export function SelectorFechaNacimiento({ etiqueta, valor, alCambiar, requerido, deshabilitado = false, error, alCerrar }) {
  const idBase = useId()
  const idError = `${idBase}-error`
  const limites = limitesNacimiento()
  const fechaValor = leerIso(valor)

  const [abierto, setAbierto] = useState(false)
  const [vista, setVista] = useState('dias') // 'anios' | 'meses' | 'dias'
  const [anio, setAnio] = useState(2000)
  const [mes, setMes] = useState(0)
  const [inicioAnios, setInicioAnios] = useState(0)
  const [diaFoco, setDiaFoco] = useState(1)
  const [posicion, setPosicion] = useState({ izquierda: 0, arriba: 0, abajo: 'auto' })
  const referencia = useRef(null)
  const capaRef = useRef(null)
  const disparadorRef = useRef(null)
  const debeEnfocar = useRef(false)
  const estabaAbierto = useRef(false)
  // «Tocado» (para mostrar errores) solo al cerrar el selector, no al mover el foco hacia el panel.
  useEffect(() => {
    if (estabaAbierto.current && !abierto) alCerrar?.()
    estabaAbierto.current = abierto
  }, [abierto]) // eslint-disable-line react-hooks/exhaustive-deps

  function calcularPosicion() {
    const caja = referencia.current?.getBoundingClientRect()
    if (!caja) return
    const margen = 8
    const x = Math.min(caja.left, window.innerWidth - ANCHO - margen)
    const izquierda = Math.max(margen, x)
    const debajo = caja.bottom + 8
    const cabeAbajo = debajo + ALTO <= window.innerHeight - margen
    const cabeArriba = caja.top - 8 - ALTO >= margen
    if (cabeAbajo || !cabeArriba) setPosicion({ izquierda, arriba: debajo, abajo: 'auto' })
    else setPosicion({ izquierda, arriba: 'auto', abajo: window.innerHeight - caja.top + 8 })
  }

  useEffect(() => {
    if (!abierto) return undefined
    calcularPosicion()
    function fuera(evento) {
      const dentro = referencia.current?.contains(evento.target) || capaRef.current?.contains(evento.target)
      if (!dentro) setAbierto(false)
    }
    window.addEventListener('resize', calcularPosicion)
    window.addEventListener('scroll', calcularPosicion, true)
    document.addEventListener('mousedown', fuera)
    return () => {
      window.removeEventListener('resize', calcularPosicion)
      window.removeEventListener('scroll', calcularPosicion, true)
      document.removeEventListener('mousedown', fuera)
    }
  }, [abierto])

  // Lleva el foco al elemento activo de la vista actual cuando la acción viene del teclado/apertura/cambio de vista.
  useEffect(() => {
    if (!abierto || !debeEnfocar.current) return
    debeEnfocar.current = false
    const capa = capaRef.current
    if (!capa) return
    const objetivo = vista === 'dias' ? capa.querySelector(`[data-dia="${diaFoco}"]`)
      : vista === 'meses' ? capa.querySelector(`[data-mes="${mes}"]`)
        : capa.querySelector(`[data-anio="${anio}"]`)
    objetivo?.focus()
  })

  function abrir() {
    if (deshabilitado) return
    calcularPosicion()
    if (fechaValor) {
      setAnio(fechaValor.anio); setMes(fechaValor.mes); setDiaFoco(fechaValor.dia)
      setInicioAnios(inicioPaginaAnios(fechaValor.anio))
      setVista('dias')
    } else {
      // Sin valor: se empieza por el año (lo más lejano de hoy), alrededor de los 30 años.
      const sugerido = Math.min(limites.max.anio, Math.max(limites.min.anio, limites.max.anio - 30))
      setAnio(sugerido); setMes(0); setDiaFoco(1)
      setInicioAnios(inicioPaginaAnios(sugerido))
      setVista('anios')
    }
    debeEnfocar.current = true
    setAbierto(true)
  }

  function cerrar(devolverFoco = false) {
    setAbierto(false)
    if (devolverFoco) disparadorRef.current?.focus()
  }

  function elegirAnio(a) {
    setAnio(a)
    // Si el mes ya elegido queda fuera del rango (p. ej. este año, meses futuros), se ajusta.
    const f = ajustarAlRango(a, mes, diaFoco, limites)
    setMes(f.mes); setDiaFoco(f.dia)
    setVista('meses'); debeEnfocar.current = true
  }

  function elegirMes(m) {
    const f = ajustarAlRango(anio, m, diaFoco, limites)
    setMes(f.mes); setDiaFoco(f.dia)
    setVista('dias'); debeEnfocar.current = true
  }

  function elegirDia(d) {
    if (!estaEnRango({ anio, mes, dia: d }, limites)) return
    alCambiar(aIso(anio, mes, d))
    cerrar(true)
  }

  function cambiarMes(delta) {
    const total = anio * 12 + mes + delta
    const na = Math.floor(total / 12); const nm = total - na * 12
    if (!mesEnRango(na, nm, limites)) return
    const f = ajustarAlRango(na, nm, diaFoco, limites)
    setAnio(f.anio); setMes(f.mes); setDiaFoco(f.dia)
  }

  function moverDia(delta) {
    const base = new Date(anio, mes, diaFoco + delta)
    const f = { anio: base.getFullYear(), mes: base.getMonth(), dia: base.getDate() }
    if (!estaEnRango(f, limites)) return
    setAnio(f.anio); setMes(f.mes); setDiaFoco(f.dia)
    debeEnfocar.current = true
  }

  function moverPeriodo(mesesDelta) {
    const total = anio * 12 + mes + mesesDelta
    const na = Math.floor(total / 12); const nm = total - na * 12
    const f = ajustarAlRango(na, nm, diaFoco, limites)
    setAnio(f.anio); setMes(f.mes); setDiaFoco(f.dia)
    debeEnfocar.current = true
  }

  function teclado(evento) {
    if (evento.key === 'Escape') { evento.preventDefault(); cerrar(true); return }
    if (vista !== 'dias' || !evento.target.dataset?.dia) return
    const mov = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (evento.key in mov) { evento.preventDefault(); moverDia(mov[evento.key]) }
    else if (evento.key === 'PageDown' || evento.key === 'PageUp') {
      evento.preventDefault()
      const paso = evento.shiftKey ? 12 : 1
      moverPeriodo(evento.key === 'PageDown' ? paso : -paso)
    } else if (evento.key === 'Home' || evento.key === 'End') {
      evento.preventDefault()
      const lunes = (new Date(anio, mes, diaFoco).getDay() + 6) % 7
      moverDia(evento.key === 'Home' ? -lunes : 6 - lunes)
    }
  }

  function cambiarPagina(delta) {
    setInicioAnios((i) => i + delta * ANIOS_POR_PAGINA)
  }

  const textoControl = fechaValor ? textoFecha(valor) : 'Selecciona una fecha'
  const hayError = Boolean(error)

  // ---- datos por vista ----
  const diasMes = diasDelMes(anio, mes)
  const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7
  const celdas = [...Array(desfase).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)]
  const puedeMesAnterior = mesEnRango(mes === 0 ? anio - 1 : anio, mes === 0 ? 11 : mes - 1, limites)
  const puedeMesSiguiente = mesEnRango(mes === 11 ? anio + 1 : anio, mes === 11 ? 0 : mes + 1, limites)
  const aniosPagina = Array.from({ length: ANIOS_POR_PAGINA }, (_, i) => inicioAnios + i)
  const puedePaginaAnterior = inicioAnios > limites.min.anio
  const puedePaginaSiguiente = inicioAnios + ANIOS_POR_PAGINA <= limites.max.anio

  return (
    <div className={`campo-texto selector-nacimiento${deshabilitado ? ' campo-texto--deshabilitado' : ''}`} ref={referencia}>
      <span className="campo-texto__cabecera">
        <span className="campo-texto__etiqueta" id={`${idBase}-etiqueta`}>{etiqueta}</span>
      </span>

      <button
        type="button"
        ref={disparadorRef}
        id={idBase}
        className={`selector-nacimiento__control${hayError ? ' selector-nacimiento__control--error' : ''}${fechaValor ? '' : ' selector-nacimiento__control--vacio'}`}
        aria-labelledby={`${idBase}-etiqueta ${idBase}-valor`}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-required={requerido ? 'true' : undefined}
        aria-invalid={hayError ? 'true' : undefined}
        aria-describedby={hayError ? idError : undefined}
        disabled={deshabilitado}
        onClick={() => (abierto ? cerrar() : abrir())}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="5.5" width="16" height="15" rx="2.4" stroke="currentColor" strokeWidth="1.7" />
          <path d="M4 9.5h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <span id={`${idBase}-valor`} className="selector-nacimiento__texto">{textoControl}</span>
        <svg className="selector-nacimiento__chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="m3.5 5.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {hayError && (
        <span className="campo-texto__error" id={idError}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 7.5v5.5M12 16.2v.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {error}
        </span>
      )}

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
          <div className="selector-fecha__calendario selector-nacimiento__panel" role="dialog" aria-label={`Elegir ${etiqueta.toLowerCase()}`} onKeyDown={teclado}>
            <div className="selector-fecha__cabecera">
              <button
                type="button"
                className="selector-fecha__nav"
                aria-label={vista === 'dias' ? 'Mes anterior' : vista === 'meses' ? 'Año anterior' : 'Años anteriores'}
                disabled={vista === 'dias' ? !puedeMesAnterior : vista === 'meses' ? !anioEnRango(anio - 1, limites) : !puedePaginaAnterior}
                onClick={() => (vista === 'dias' ? cambiarMes(-1) : vista === 'meses' ? setAnio(anio - 1) : cambiarPagina(-1))}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>

              <div className="selector-nacimiento__titulo" aria-live="polite">
                {vista === 'anios' ? (
                  <span className="selector-nacimiento__rango">{inicioAnios} – {inicioAnios + ANIOS_POR_PAGINA - 1}</span>
                ) : (
                  <>
                    {vista === 'dias' && (
                      <button type="button" className="selector-nacimiento__chip" onClick={() => { setVista('meses'); debeEnfocar.current = true }}>
                        <span style={{ textTransform: 'capitalize' }}>{MESES[mes]}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="selector-nacimiento__chip"
                      aria-label={`Año ${anio}. Cambiar año`}
                      onClick={() => { setInicioAnios(inicioPaginaAnios(anio)); setVista('anios'); debeEnfocar.current = true }}
                    >
                      {anio}
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="m3.5 5.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                className="selector-fecha__nav"
                aria-label={vista === 'dias' ? 'Mes siguiente' : vista === 'meses' ? 'Año siguiente' : 'Años siguientes'}
                disabled={vista === 'dias' ? !puedeMesSiguiente : vista === 'meses' ? !anioEnRango(anio + 1, limites) : !puedePaginaSiguiente}
                onClick={() => (vista === 'dias' ? cambiarMes(1) : vista === 'meses' ? setAnio(anio + 1) : cambiarPagina(1))}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            <div className="selector-fecha__cuerpo selector-nacimiento__cuerpo">
              {vista === 'anios' && (
                <div className="selector-nacimiento__rejilla" role="group" aria-label="Elegir año">
                  {aniosPagina.map((a) => {
                    const fuera = !anioEnRango(a, limites)
                    const sel = fechaValor?.anio === a
                    return (
                      <button
                        key={a}
                        type="button"
                        data-anio={a}
                        className={`selector-nacimiento__celda${sel ? ' selector-nacimiento__celda--sel' : ''}${a === anio ? ' selector-nacimiento__celda--activa' : ''}`}
                        disabled={fuera}
                        aria-pressed={sel}
                        onClick={() => elegirAnio(a)}
                      >
                        {a}
                      </button>
                    )
                  })}
                </div>
              )}

              {vista === 'meses' && (
                <div className="selector-nacimiento__rejilla" role="group" aria-label={`Elegir mes de ${anio}`}>
                  {MESES_CORTOS.map((nombre, m) => {
                    const fuera = !mesEnRango(anio, m, limites)
                    const sel = fechaValor?.anio === anio && fechaValor?.mes === m
                    return (
                      <button
                        key={nombre}
                        type="button"
                        data-mes={m}
                        aria-label={MESES[m]}
                        className={`selector-nacimiento__celda${sel ? ' selector-nacimiento__celda--sel' : ''}${m === mes ? ' selector-nacimiento__celda--activa' : ''}`}
                        disabled={fuera}
                        aria-pressed={sel}
                        onClick={() => elegirMes(m)}
                      >
                        {nombre}
                      </button>
                    )
                  })}
                </div>
              )}

              {vista === 'dias' && (
                <>
                  <div className="selector-fecha__semana" aria-hidden="true">
                    {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
                  </div>
                  <div className="selector-fecha__dias" role="group" aria-label={`${MESES[mes]} de ${anio}`}>
                    {celdas.map((d, i) => {
                      if (!d) return <span key={`v${i}`} className="selector-fecha__vacio" aria-hidden="true" />
                      const fuera = !estaEnRango({ anio, mes, dia: d }, limites)
                      const sel = fechaValor && fechaValor.anio === anio && fechaValor.mes === mes && fechaValor.dia === d
                      return (
                        <button
                          key={d}
                          type="button"
                          data-dia={d}
                          className={`selector-fecha__dia${sel ? ' selector-fecha__dia--seleccionado' : ''}${fuera ? ' selector-fecha__dia--no-disponible' : ''}`}
                          disabled={fuera}
                          tabIndex={d === diaFoco ? 0 : -1}
                          aria-pressed={Boolean(sel)}
                          aria-label={`${d} de ${MESES[mes]} de ${anio}${fuera ? ', no disponible' : ''}`}
                          onClick={() => elegirDia(d)}
                        >
                          {d}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
