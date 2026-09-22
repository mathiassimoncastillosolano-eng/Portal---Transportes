import { TicketPasajero } from './TicketPasajero'
import { FormularioPasajero, pasajeroEstaCompleto } from './FormularioPasajero'
import { BotonSecundario } from '../comunes/BotonSecundario'
import './gestorPasajeros.css'

function nombreCorto(datos) {
  if (!datos?.apellidos?.trim()) return datos?.nombres?.trim() ? datos.nombres.trim().split(' ')[0] : null
  const primerNombre = datos.nombres?.trim()?.split(' ')?.[0]
  return primerNombre ? `${datos.apellidos.trim().split(' ')[0]}, ${primerNombre[0]}.` : datos.apellidos.trim()
}

/**
 * Cada asiento seleccionado genera un pasajero independiente. Este
 * componente muestra un ticket por asiento (cuando hay más de uno),
 * mantiene cuál está activo y reutiliza `FormularioPasajero` para editar
 * sus datos sin perder lo ya escrito al cambiar entre tickets.
 */
export function GestorPasajeros({
  asientos,
  mostrarPiso,
  pasajeros,
  claveActiva,
  alActivar,
  alCambiarCampo,
  alEliminar,
  alCambiarAsientos,
}) {
  const total = asientos.length
  const completos = asientos.filter((asiento) => pasajeroEstaCompleto(pasajeros[asiento.clave])).length
  const asientoActivo = asientos.find((asiento) => asiento.clave === claveActiva) ?? asientos[0]

  return (
    <div className="gestor-pasajeros">
      <div className="gestor-pasajeros__encabezado">
        <div>
          <h2 className="gestor-pasajeros__titulo">Pasajeros</h2>
          <p className="gestor-pasajeros__progreso" role="status">
            {completos === total
              ? `✓ ${total} pasajero${total === 1 ? '' : 's'} completo${total === 1 ? '' : 's'}`
              : `${completos} de ${total} completados`}
          </p>
        </div>
        {alCambiarAsientos && (
          <BotonSecundario onClick={alCambiarAsientos} variante="contorno">
            Cambiar asientos
          </BotonSecundario>
        )}
      </div>

      {total > 1 && (
        <div className="gestor-pasajeros__tickets">
          {asientos.map((asiento) => (
            <TicketPasajero
              key={asiento.clave}
              asiento={asiento}
              mostrarPiso={mostrarPiso}
              completo={pasajeroEstaCompleto(pasajeros[asiento.clave])}
              nombrePreview={nombreCorto(pasajeros[asiento.clave])}
              activo={asiento.clave === claveActiva}
              onSeleccionar={() => alActivar(asiento.clave)}
              onEliminar={() => alEliminar(asiento.clave)}
            />
          ))}
        </div>
      )}

      {asientoActivo && (
        <>
          <p className="gestor-pasajeros__subtitulo">
            Datos del pasajero · Asiento {asientoActivo.numero}
            {mostrarPiso && ` · Piso ${asientoActivo.piso}`}
          </p>
          <FormularioPasajero
            key={asientoActivo.clave}
            valores={pasajeros[asientoActivo.clave]}
            alCambiarCampo={(campo, valor) => alCambiarCampo(asientoActivo.clave, campo, valor)}
          />
        </>
      )}
    </div>
  )
}
