import './campoTexto.css'

export function CampoTexto({
  etiqueta,
  tipo = 'text',
  valor,
  alCambiar,
  marcador,
  requerido,
  error,
  autoComplete,
  icono,
  modoEntrada,
  ayuda,
}) {
  return (
    <label className={`campo-texto ${icono ? 'campo-texto--con-icono' : ''}`}>
      <span className="campo-texto__etiqueta">{etiqueta}</span>
      <span className="campo-texto__envoltura">
        {icono && <span className="campo-texto__icono" aria-hidden="true">{icono}</span>}
        <input
          className={`campo-texto__entrada ${error ? 'campo-texto__entrada--error' : ''}`}
          type={tipo}
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
          placeholder={marcador}
          required={requerido}
          autoComplete={autoComplete}
          inputMode={modoEntrada}
        />
      </span>
      {error ? (
        <span className="campo-texto__error">{error}</span>
      ) : (
        ayuda && <span className="campo-texto__ayuda">{ayuda}</span>
      )}
    </label>
  )
}
