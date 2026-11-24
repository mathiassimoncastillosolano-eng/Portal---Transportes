const PALABRAS_VACIAS = new Set([
  'a', 'al', 'ante', 'con', 'de', 'del', 'el', 'en', 'es', 'la', 'las', 'lo', 'los',
  'mi', 'mis', 'me', 'no', 'o', 'para', 'por', 'que', 'se', 'si', 'su', 'sus', 'un',
  'una', 'unos', 'unas', 'y', 'como', 'cual', 'cuando', 'donde', 'puedo', 'hago',
  'quiero', 'necesito', 'quisiera', 'deseo', 'debo', 'estan', 'esta', 'hay',
])

export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extraerTerminos(consulta) {
  const todos = normalizar(consulta).split(' ').filter(Boolean)
  const utiles = todos.filter((t) => !PALABRAS_VACIAS.has(t))
  return utiles.length ? utiles : todos
}

function contiene(texto, termino) {
  if (texto.includes(termino)) return true
  return termino.length > 3 && termino.endsWith('s') && texto.includes(termino.slice(0, -1))
}

function puntuar(campos, terminos) {
  let total = 0
  for (const termino of terminos) {
    let mejor = 0
    for (const { texto, peso } of campos) {
      if (peso > mejor && contiene(texto, termino)) mejor = peso
    }
    if (mejor === 0) return 0
    total += mejor
  }
  return total
}

function textoPasos(guia) {
  return (guia.pasos ?? guia.escenas ?? [])
    .map((p) => [p.titulo, p.texto, p.donde, p.aviso, p.consejo, ...(p.datos ?? [])].filter(Boolean).join(' '))
    .join(' ')
}

export function buscarAyuda(consulta, { categorias, guias, preguntas }) {
  const terminos = extraerTerminos(consulta)
  if (!terminos.length) return { guias: [], preguntas: [] }

  const etiquetaCategoria = (id) => normalizar(categorias.find((c) => c.id === id)?.etiqueta)

  const guiasEncontradas = guias
    .map((guia) => ({
      guia,
      puntaje: puntuar(
        [
          { texto: normalizar(guia.titulo), peso: 5 },
          { texto: normalizar(guia.palabras), peso: 4 },
          { texto: etiquetaCategoria(guia.categoria), peso: 3 },
          { texto: normalizar(guia.resumen ?? guia.descripcion), peso: 2 },
          { texto: normalizar(textoPasos(guia)), peso: 1 },
        ],
        terminos,
      ),
    }))
    .filter((r) => r.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje)
    .map((r) => r.guia)

  const preguntasEncontradas = preguntas
    .map((pregunta) => ({
      pregunta,
      puntaje: puntuar(
        [
          { texto: normalizar(pregunta.pregunta), peso: 5 },
          { texto: normalizar(pregunta.palabras), peso: 4 },
          { texto: etiquetaCategoria(pregunta.categoria), peso: 3 },
          { texto: normalizar(pregunta.respuesta), peso: 1 },
        ],
        terminos,
      ),
    }))
    .filter((r) => r.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje)
    .map((r) => r.pregunta)

  return { guias: guiasEncontradas, preguntas: preguntasEncontradas }
}
