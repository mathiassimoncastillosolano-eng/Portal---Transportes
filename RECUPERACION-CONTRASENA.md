# Recuperación de contraseña (modales + Resend)

Flujo: **Iniciar sesión → «¿Olvidaste tu contraseña?» → método → correo → código → nueva contraseña → confirmación → Iniciar sesión**. Todo en modales (un único modal activo a la vez, orquestado en `LayoutPrincipal`); no hay página de recuperación.

## Endpoints (públicos, `POST /api/auth/password-reset/…`)

| Ruta | Cuerpo | Respuesta |
|---|---|---|
| `/request` | `{correo}` | 200 genérica (idéntica exista o no la cuenta): `{mensaje, expiraEnMinutos, reenvioEnSegundos}` · 400 formato · 429 límites · 503 si Resend no confirma |
| `/resend` | `{correo}` | igual que `/request` (emite un código nuevo e invalida el anterior) |
| `/verify` | `{correo, codigo}` | 200 `{pruebaRecuperacion, expiraEnSegundos}` · 400 código incorrecto/caducado/usado (mensaje único) · 429 demasiados intentos |
| `/complete` | `{pruebaRecuperacion, contrasena, confirmarContrasena}` | 200 `{mensaje}` · 400 política · 410 verificación vencida/usada · 429 |

El cliente **nunca** envía un id de usuario: la cuenta sale del desafío que el backend verificó.

## Seguridad implementada
- Código de 6 dígitos con `SecureRandom`; en BD solo `token_hash` = HMAC-SHA256 (64 hex) con secreto del servidor, ligado al usuario; comparación en tiempo constante.
- Caduca a los 10 min (`RECUPERACION_CODIGO_MINUTOS`). Máx. 5 intentos por desafío (en BD). Un código nuevo invalida los anteriores; el código se consume al verificarlo.
- La prueba devuelta por `/verify` es un token firmado (HMAC, otra clave derivada) de 10 min; además el servidor exige que el desafío siga verificado, sin usar y dentro de la ventana. El consumo es un `UPDATE … WHERE fecha_uso IS NULL` dentro de la misma transacción que cambia la contraseña (un solo ganador con concurrencia). Tras el cambio se invalidan los demás códigos pendientes.
- Sin enumeración: respuesta idéntica para cuentas inexistentes, inactivas y de Google; los errores de verificación son genéricos y el bloqueo por intentos también se aplica (en memoria) a correos inexistentes.
- Límites: 60 s entre solicitudes por correo, 10 solicitudes/15 min por IP, 5 códigos/hora por cuenta (en BD, silencioso), 30 verificaciones y 20 cambios/15 min por IP. Los límites en memoria son por instancia.
- Cuentas de Google sin contraseña local: no se crea código; reciben un correo informativo («usa Google para entrar»). Su `google_id` y su acceso no se tocan.
- Contraseña: misma política del registro (≥ 8 caracteres, ≤ 72 bytes), BCrypt con el `PasswordEncoder` existente.
- Logs: nunca se registran códigos, contraseñas ni la clave de Resend.

## Variables de entorno
| Variable | Obligatoria | Descripción |
|---|---|---|
| `RECUPERACION_SECRETO` | **Sí** | ≥ 32 caracteres aleatorios. Sin ella el backend no arranca. |
| `RESEND_API_KEY` | Sí (para enviar) | API key de Resend. Sin ella las solicitudes de cuentas reales devuelven 503. |
| `RESEND_FROM` | Sí (para enviar) | Ej.: `RutaLibre <no-reply@tu-dominio.com>` (dominio verificado en Resend). |
| `FORWARD_HEADERS_STRATEGY` | No | `framework` si el backend está tras un proxy de confianza (para limitar por IP real). |
| `RECUPERACION_*` | No | Ajustes de tiempos y límites (ver `application.properties`). |

En local ponlas en `backend/.env.properties` (ignorado por git). **No pegues claves reales en el repo ni en el chat.**

## Configurar Resend
1. Crea una API key en resend.com (permiso *Sending access*).
2. En *Domains*, añade y verifica tu dominio (registros SPF/DKIM en tu DNS).
3. Usa un remitente de ese dominio en `RESEND_FROM`. Con `onboarding@resend.dev` solo puedes enviar al correo de tu propia cuenta de Resend (válido para pruebas).
4. Si alguna clave se compartió en una conversación, revócala y crea otra.

## Migración SQL
Ejecuta **antes de desplegar** `backend/db/migraciones/002_recuperacion_contrasena.sql` en el SQL Editor de Supabase. Es idempotente y no destructiva: crea la tabla solo si no existe, añade `intentos` y `fecha_verificacion`, asegura índices y activa RLS (revoca `anon`/`authenticated`). El backend sigue en `ddl-auto=validate`.

## Pruebas
- Frontend: `npm test` (incluye `recuperacionContrasena.test.js` y `recuperacionServicio.test.js`) y `npm run build`.
- Backend (`cd backend && ./mvnw test`): `CriptoRecuperacionTest`, `LimitadorVentanaTest`, `ResendClienteCorreoTest` (servidor HTTP local, nunca llama a Resend), `PlantillasCorreoRecuperacionTest`, `RecuperacionContrasenaIntegracionTest` y `RecuperacionContrasenaLimitesIntegracionTest` (H2; el correo y Google están simulados).

## Notas / límites conocidos
- La sesión JWT ya emitida de la cuenta sigue válida hasta expirar tras cambiar la contraseña (el proyecto no tiene revocación por usuario).
- Un fallo de Resend responde 503 solo para cuentas reales y elegibles; no se puede provocar a voluntad, pero es una pista residual. Tampoco se iguala el tiempo de respuesta entre cuentas existentes e inexistentes.
