import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { BotonSecundario } from '../comunes/BotonSecundario'

export function BarraAcciones({
  alVolver,
  alCancelar,
  alContinuar,
  textoContinuar,
  deshabilitado = false,
  cargando = false,
  bloqueado = false,
  ayuda,
  idAyuda,
}) {
  return (
    <div className="postergacion-acciones">
      {ayuda && <p className="postergacion-acciones__ayuda" id={idAyuda}>{ayuda}</p>}
      <div className="postergacion-acciones__fila">
        <div className="postergacion-acciones__secundarias">
          {alVolver && (
            <BotonSecundario variante="fantasma" onClick={alVolver} deshabilitado={bloqueado}>← Atrás</BotonSecundario>
          )}
          <BotonSecundario variante="fantasma" onClick={alCancelar} deshabilitado={bloqueado}>Cancelar</BotonSecundario>
        </div>
        {alContinuar && (
          <BotonPrincipal
            onClick={alContinuar}
            deshabilitado={deshabilitado || cargando || bloqueado}
            cargando={cargando}
            descritoPor={deshabilitado && idAyuda ? idAyuda : undefined}
          >
            {textoContinuar}
          </BotonPrincipal>
        )}
      </div>
    </div>
  )
}
