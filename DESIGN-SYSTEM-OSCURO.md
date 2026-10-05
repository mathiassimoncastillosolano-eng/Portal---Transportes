# RutaLibre — Dark Design System

Remasterización del modo oscuro. Principio: **low-luminance, high-clarity**.
No es un filtro del modo claro: tiene su propia escala de superficies, bordes,
sombras, acento y movimiento. El modo claro no se modificó (verificado: 0 px de
diferencia frente al original en la maqueta de comparación).

## Arquitectura

| Archivo | Rol |
|---|---|
| `src/estilos/tokens.css` | Bloque `[data-theme='dark']` reescrito + tokens semánticos nuevos en `:root` (alias, acento, escala de bordes, tallas de sombra, duraciones). Es el único lugar donde se cambian colores. |
| `src/estilos/oscuro.css` (nuevo) | Refinamientos por componente que los tokens no pueden resolver (colores fijos del CSS base pensados para claro). Todo bajo `[data-theme='dark']`. Importado desde `globales.css`. |
| `componentes/comunes/botones.css` | Variantes nuevas `.boton-terciario`, `.boton-destructivo`, `.boton-exito` (solo tokens, válidas en ambos temas). |
| `componentes/comunes/campoTexto.css` | Modificador `.campo-texto__entrada--exito`. |

No se tocó JSX, lógica, servicios, rutas ni backend. El conmutador de tema,
el script anti-parpadeo y `ContextoTema` siguen igual.

## Jerarquía de superficies

| Nivel | Token | Valor | Uso |
|---|---|---|---|
| Lienzo | `--color-fondo` | `#070F13` | Fondo de página |
| Lienzo secundario | `--color-fondo-alterno` | `#0A161B` | Zonas alternas |
| Panel secundario | `--color-superficie-1` | `#0C1A20` | Paneles hundidos |
| Superficie | `--color-superficie` | `#0E1C22` | Tarjetas base |
| Elevada | `--color-superficie-elevada` | `#12242B` | Resumen, menús, modales, buscador |
| Fuerte | `--superficie-fuerte` | `#172F37` | Cabeceras, opción activa |
| Interactiva | `--superficie-interactiva` | `#1B353E` | Paso activo, controles |
| Overlay | `--superficie-overlay` / `--scrim` | rgba | Vidrio funcional y velo de modales |

Reparto aproximado: ~80 % neutro oscuro · ~15 % neutro secundario · ~5 % acento.

## Color

- **Texto:** principal `#E9F1F3` (15.2:1) · secundario `#A9BBC2` (8.8:1) · terciario `#82979F` (5.7:1). Los títulos de marca pasan a neutro de alto contraste; el color de marca queda para el acento.
- **Bordes:** sutil `6 %` · defecto `9 %` · intenso `14 %` (blanco translúcido). Inputs: `--borde-entrada` `36 %` (≥ 3:1, WCAG 1.4.11) porque el borde de un control debe ser identificable.
- **Acento (menta-turquesa):** `--acento #3CCDA3`, hover `#4FD9B0`, active `#31B58E`, texto sobre acento `#04211A`. Reservado a acción primaria, selección, foco y confirmación.
- **Semánticos** (en iconos, badges y bordes selectivos; fondos = tintes de baja opacidad): éxito `#3FCF9B`, aviso `#F0B429`, error `#F2706E`, info `#6CC4DB`.

## Sombras, radios, espaciado, movimiento

- **Sombras:** `--sombra-sm/md/lg/xl` (alias de tenue/suave/marcada/flotante), amplias y difusas, siempre combinadas con borde sutil + contraste de superficie.
- **Radios / espaciado:** se conservan las escalas existentes (`--radio-sm…xl`, `--espacio-1…10`, base 4/8/12/16/24/32/40/56/80/112); se añadió `--radio-xs`.
- **Movimiento (solo oscuro):** rápido 120 ms · normal 200 ms · lento 300 ms, easing `cubic-bezier(0.2, 0, 0, 1)`. Animaciones en modal, desplegables, selección de asiento y feedback de botón; respeta `prefers-reduced-motion`.

## Componentes

- **Navbar:** vidrio ligero (blur 16 px), borde inferior sutil, enlace activo = píldora neutra + trazo de acento, “Ingresar” tonal (no sólido), perfil neutro.
- **Botones:** primario acento sólido sin resplandor; secundario neutro; fantasma; terciario; destructivo; éxito. Hover +luminancia, active −luminancia, foco con anillo de acento, deshabilitado legible.
- **Inputs:** superficie translúcida + borde ≥ 3:1; foco con borde de acento + anillo; estados default/hover/focus/filled/error/éxito/disabled; autocompletado del navegador neutralizado.
- **Resumen Lima → Cusco:** ruta como foco, metadatos de menor contraste, precio protagonista, CTA acento. Sin bloque teal ni filo de color; el estado “listo” lo marca el borde de acento. En móvil pasa a barra inferior fija.
- **Selector de piso:** control segmentado sobre pista hundida; la opción activa es superficie fuerte + indicador de acento.
- **Mapa de asientos:** disponible = neutro · hover = +luminancia · seleccionado = acento + ✓ · ocupado = rojo discreto + ✕ · bloqueado = gris + candado · foco = anillo claro. El estado nunca depende solo del color.
- **Calendario, filtros, progreso, contador, modales, perfil, pasajes, pago, auth, footer:** adaptados al mismo lenguaje (tintes en lugar de bloques sólidos).
- **Fondo:** dos luces ambientales casi imperceptibles; se eliminó la trama de círculos/puntos en oscuro.

## Auditoría de contraste (WCAG 2.1 AA)

27 pares verificados, 0 fallos. Destacados: texto/superficie 15.2:1; texto terciario 5.2–5.7:1; texto sobre botón primario 8.5:1; texto sobre asiento seleccionado 8.5:1; borde de foco 8.7:1; borde de input ≥ 3.3:1.

## Cómo modificar el dark mode

Cambiar valores en el bloque `[data-theme='dark']` de `tokens.css`. `oscuro.css` solo consume tokens (salvo tintes blancos/negros translúcidos), así que un cambio de paleta se propaga a toda la app.

## Verificación realizada y pendiente

**Hecho:** render en Chromium de los componentes clave con el CSS y marcado reales (desktop 1360 px y móvil 390 px); contraste calculado; diff del modo claro (0 px); `npm test` de utilidades/servicios.

**No hecho (sin red no pude ejecutar `npm ci` / `vite build` ni la app completa):** revisión visual de cada página con datos reales. Revisar a mano: Inicio (hero), Resultados, Reserva (los 3 pasos), Pago, Perfil/Mis pasajes/Historial, Ayuda, Iniciar sesión/Crear cuenta, Servicios, 404 y estados vacío/carga/error. Si algún componente conserva un bloque teal o un texto de bajo contraste, se corrige con una regla en `oscuro.css` o, mejor, con un token.
