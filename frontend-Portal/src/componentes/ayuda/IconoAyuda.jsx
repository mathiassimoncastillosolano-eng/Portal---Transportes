const TRAZOS = {
  inicio: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  buscar: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.5-4.5',
  filtro: 'M4 5h16l-6 7v6l-4 2v-8L4 5z',
  ticket: 'M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4V8zM14 6v12',
  usuario: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  boleto: 'M7 3h10a2 2 0 012 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 012-2zM9 8h6M9 12h6',
  cambio: 'M17 3l4 4-4 4M21 7H8a4 4 0 00-4 4M7 21l-4-4 4-4M3 17h13a4 4 0 004-4',
  reloj: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  mapa: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  ayuda: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.2-1.5 2.2M12 17h.01',
  atras: 'M15 18l-6-6 6-6',
  siguiente: 'M9 18l6-6-6-6',
  cerrar: 'M6 6l12 12M18 6L6 18',
  chevron: 'M6 9l6 6 6-6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alerta: 'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',
  consejo: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z',
  ubicacion: 'M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  candado: 'M6 11h12v9H6zM8 11V8a4 4 0 118 0v3',
  guia: 'M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5zM4 19a2 2 0 012-2h12M9 8h6',
  pregunta: 'M4 5h16v11H9l-5 4V5zM9.5 9.5a2.5 2.5 0 114 2c-.7.5-1.5 1-1.5 1.8',
  salir: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  reproducir: 'M7 4.5v15l12-7.5-12-7.5z',
  pausa: 'M8 5v14M16 5v14',
  reiniciar: 'M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5',
}

export function IconoAyuda({ nombre, tamano = 20 }) {
  return (
    <svg
      className="centro-ayuda__icono"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={TRAZOS[nombre] ?? TRAZOS.ayuda} />
    </svg>
  )
}
