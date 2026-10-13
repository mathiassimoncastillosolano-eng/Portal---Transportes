import { useEffect, useMemo, useState } from 'react'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { listarCompras } from '../../servicios/comprasServicio'
import { agruparPasajes } from '../../utilidades/pasajesVista'
import { TarjetaPasaje } from '../../componentes/perfil/TarjetaPasaje'
import { PanelAsincrono } from '../../componentes/carga'
import './paginaMisPasajes.css'

export function PaginaMisPasajes() {
  const { usuario } = useAutenticacion()
  const [datos, setDatos] = useState(null)
  const [estado, setEstado] = useState('cargando')
  const [error, setError] = useState('')
  const [intentos, setIntentos] = useState(0)

  useEffect(() => {
    let cancelado = false
    setEstado('cargando')
    setError('')
    listarCompras()
      .then((respuesta) => {
        if (cancelado) return
        setDatos(respuesta)
        setEstado('listo')
      })
      .catch((fallo) => {
        if (cancelado) return
        setError(fallo.message || 'No se pudieron cargar tus pasajes.')
        setEstado('error')
      })
    return () => { cancelado = true }
  }, [usuario?.id, intentos])

  const compras = datos?.compras ?? []
  const { vigentes, anteriores } = useMemo(() => agruparPasajes(compras), [compras])
  const nVigentes = datos?.comprasVigentes ?? 0

  return (
    <section className="pagina-mis-pasajes">
      <div className="pagina-mis-pasajes__intro">
        <div>
          <p className="pagina-mis-pasajes__eyebrow">TU PRÓXIMO VIAJE</p>
          <h1>Mis pasajes</h1>
          <p>Consulta tus compras y los asientos incluidos en cada una.</p>
        </div>
        {estado === 'listo' && nVigentes > 0 && (
          <span className="pagina-mis-pasajes__contador">
            {nVigentes} {nVigentes === 1 ? 'compra vigente' : 'compras vigentes'}
          </span>
        )}
      </div>
      <PanelAsincrono
        variante="generico"
        mensaje="Consultando tus pasajes"
        mensajeListo="Pasajes listos"
        cargando={estado === 'cargando'}
        error={estado === 'error' ? error : null}
        vacio={estado === 'listo' && compras.length === 0}
        alReintentar={() => setIntentos((n) => n + 1)}
        estadoError={{ titulo: 'No pudimos cargar tus pasajes' }}
        estadoVacio={{
          titulo: 'Aún no tienes compras',
          texto: 'Cuando compres un pasaje, aparecerá aquí con sus asientos y boletos.',
          accion: { texto: 'Buscar un pasaje', to: '/' },
        }}
      >
        {() => (
          <>
            {vigentes.length > 0 && (
              <section className="pagina-mis-pasajes__seccion" aria-labelledby="titulo-vigentes">
                <h2 id="titulo-vigentes" className="pagina-mis-pasajes__subtitulo">Próximos viajes</h2>
                <div className="pagina-mis-pasajes__lista">
                  {vigentes.map((compra) => <TarjetaPasaje key={compra.idVenta} compra={compra} />)}
                </div>
              </section>
            )}
            {anteriores.length > 0 && (
              <section className="pagina-mis-pasajes__seccion" aria-labelledby="titulo-anteriores">
                <h2 id="titulo-anteriores" className="pagina-mis-pasajes__subtitulo">
                  {vigentes.length > 0 ? 'Compras anteriores' : 'Tus compras'}
                </h2>
                <div className="pagina-mis-pasajes__lista">
                  {anteriores.map((compra) => <TarjetaPasaje key={compra.idVenta} compra={compra} />)}
                </div>
              </section>
            )}
          </>
        )}
      </PanelAsincrono>
    </section>
  )
}
