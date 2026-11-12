const propsBase = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true }
const trazo = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function IconoLibro(props) {
  return (
    <svg {...propsBase} {...props}>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15.5H6.5A1.5 1.5 0 0 0 5 20V4.5Z" {...trazo} />
      <path d="M5 20a1.5 1.5 0 0 0 1.5 1.5H19V18.5M9 7.5h6M9 11h4" {...trazo} />
    </svg>
  )
}

export function IconoReclamo(props) {
  return (
    <svg {...propsBase} {...props}>
      <path d="M12 3.5 3.2 19a1.2 1.2 0 0 0 1 1.8h15.6a1.2 1.2 0 0 0 1-1.8L12 3.5Z" {...trazo} />
      <path d="M12 10v4.2M12 17.3v.2" {...trazo} />
    </svg>
  )
}

export function IconoQueja(props) {
  return (
    <svg {...propsBase} {...props}>
      <path d="M20.5 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 20.5 12Z" {...trazo} />
      <path d="M9 11.5h6M9 14.5h3.5" {...trazo} />
    </svg>
  )
}

export function IconoReloj(props) {
  return (
    <svg {...propsBase} {...props}>
      <circle cx="12" cy="12" r="8.5" {...trazo} />
      <path d="M12 7.5V12l3 2" {...trazo} />
    </svg>
  )
}

export function IconoEscudo(props) {
  return (
    <svg {...propsBase} {...props}>
      <path d="M12 3.2 5 6v5.6c0 4.2 2.9 7.6 7 9.2 4.1-1.6 7-5 7-9.2V6l-7-2.8Z" {...trazo} />
      <path d="m9 12 2.2 2.2L15.2 10" {...trazo} />
    </svg>
  )
}

export function IconoEdificio(props) {
  return (
    <svg {...propsBase} {...props}>
      <path d="M4.5 20.5v-15A1.5 1.5 0 0 1 6 4h8a1.5 1.5 0 0 1 1.5 1.5v15M15.5 9.5H18a1.5 1.5 0 0 1 1.5 1.5v9.5M3 20.5h18" {...trazo} />
      <path d="M8 8h4M8 11.5h4M8 15h4" {...trazo} />
    </svg>
  )
}

export function IconoCheck(props) {
  return (
    <svg {...propsBase} {...props}>
      <path d="m5.5 12.5 4.2 4.2 8.8-9.4" {...trazo} strokeWidth={2.2} />
    </svg>
  )
}

export function IconoDescarga(props) {
  return (
    <svg {...propsBase} {...props}>
      <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19.5h14" {...trazo} />
    </svg>
  )
}

export function IconoAlerta(props) {
  return (
    <svg {...propsBase} width={16} height={16} {...props}>
      <circle cx="12" cy="12" r="9" {...trazo} />
      <path d="M12 7.5v5.5M12 16.2v.6" {...trazo} />
    </svg>
  )
}
