// Reprogramación · Se muestra al volver a elegir viaje cuando se acabó el tiempo
// para escoger asiento. El pasaje original sigue igual y puede elegir otro viaje.
export function AvisoSesionVencida() {
  return (
    <p className="postergacion-aviso postergacion-aviso--aviso" role="status">
      Se acabó el tiempo para elegir tu asiento y lo liberamos. Tu pasaje original no cambió:
      elige de nuevo el viaje al que quieres moverlo.
    </p>
  )
}
