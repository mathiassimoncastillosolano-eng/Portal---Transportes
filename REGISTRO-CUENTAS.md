# Entrega de Lucas: registro de cuentas

Integrado sobre `origin/main` en el commit `9a10a9c` (21/09/2026), que ya contiene el login JWT y las tarjetas de destinos y servicios. Rama de trabajo: `lucas/registro-cuentas`.

## Qué incluye

- `POST /api/usuarios/registro` público, devuelve 201 con `idUsuario`, `nombres`, `apellidos` y `correo`.
- Validación de datos obligatorios, formato/longitud del correo, nombres/apellidos de hasta 100 caracteres y teléfono opcional de hasta 20 caracteres.
- Contraseña de al menos 8 caracteres, límite de 72 bytes UTF-8 de BCrypt. No se recorta ni se normaliza la contraseña.
- Correo guardado en minúsculas y sin espacios exteriores. Comprobación de duplicados sin distinguir mayúsculas.
- BCrypt compartido con `ConfiguracionSeguridad` del login. No hay un segundo bean `PasswordEncoder`.
- Conflictos simultáneos resueltos mediante la unicidad de PostgreSQL y respuesta 409. El repositorio termina su transacción antes de volver a consultar el correo tras un fallo.
- Respuestas de error unificadas con `RespuestaError` del login: `mensaje`, `detalles`, `status`, `ruta`, etc. No se devuelven hashes, contraseñas ni mensajes internos de SQL.
- Formulario de página y modal conectados a la API real; se muestra éxito y se pasa al inicio de sesión. Crear una cuenta por sí solo no establece una sesión ni inventa un JWT.
- Registro con Google fuera de alcance; retirado de ambos formularios de registro.
- Configuración JPA `validate`: no modifica el esquema de Supabase al arrancar.

## Cómo funciona

Formulario → `RegistroUsuarioController` → validación del DTO → `RegistroUsuarioService` → `UsuarioRepository` → tabla `usuario`.

El servicio comprueba el correo y convierte la contraseña en hash. Al guardar, PostgreSQL genera el ID y las fechas de creación/actualización iniciales. Login y perfil usan la misma entidad `Usuario` y su método `estaActivo()`.

El repositorio conserva `findByCorreoIgnoreCase` para el login y añade `existsByCorreoIgnoreCase` para el registro. La regla pública de registro está antes de `/api/usuarios/**`, que sigue protegido por JWT.

## Ejecutar

Desde la raíz del repositorio, primera terminal:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Segunda terminal, desde la raíz:

```powershell
npm run dev
```

Si Node no está en el PATH de esta computadora, usar `..\Iniciar-web.cmd` desde la raíz (herramienta local creada anteriormente, no forma parte del repositorio).

Abrir `http://localhost:5173/crear-cuenta`. La variable `VITE_API_URL` usa por defecto `http://localhost:8080`; ver `.env.example`. Abrir la URL POST directamente en el navegador no registra una cuenta.

## Pruebas automatizadas

```powershell
cd backend
.\mvnw.cmd test
cd ..
npm run test:registro
npm run build
```

Las pruebas Java usan `application-test.properties` y una base H2 en memoria con modo PostgreSQL. Nunca inicializan tablas en Supabase. Cubren creación, BCrypt, login real con JWT, consulta de perfil protegido, validación, límites UTF-8, errores JSON, CORS y dos solicitudes que superan simultáneamente la comprobación previa de correo. Esa última prueba fuerza la carrera mediante una barrera y verifica exactamente un 201, un 409 y una sola fila.

Resultado verificado: **9 pruebas backend y 4 pruebas frontend aprobadas**, más compilación de producción de Vite. También se probó en navegador crear una cuenta sin teléfono, recibir confirmación, iniciar sesión y acceder a su perfil usando la base de prueba local.

También se comprobó el arranque con la conexión real a Supabase y `ddl-auto=validate`: conexión y validación del esquema correctas. Esta comprobación no creó usuarios ni modificó tablas en la base compartida.

Límite de la prueba de concurrencia: se ejecuta en H2, no en el servicio compartido de Supabase. Se utiliza la restricción `uq_usuario_correo` ya existente en PostgreSQL; no se propone ni ejecuta una migración. El índice existente distingue mayúsculas, por lo que otros procesos que inserten cuentas también deben normalizar el correo. La ruta de registro implementada sí lo hace.

## Subir la entrega

Comandos para guardar y publicar cambios de esta entrega desde la raíz:

```powershell
git branch --show-current
git status --short
git add backend src package.json REGISTRO-CUENTAS.md
git diff --cached --stat
git commit -m "feat: registro de cuentas integrado con login JWT"
git push -u origin lucas/registro-cuentas
```

La rama debe ser `lucas/registro-cuentas`. En GitHub, crear un Pull Request con base `main` y compare `lucas/registro-cuentas`. No usar `--force`. El PR contiene las diferencias del registro sobre la nueva versión; no debe traer el historial antiguo.

Título sugerido: `Registro de cuentas integrado con login JWT`.

Descripción sugerida: `Implementa registro público con validación, BCrypt compartido con el login, manejo de correo duplicado y conexión del formulario web. Incluye pruebas de registro, login, perfil protegido y solicitudes simultáneas. Validación: 9 pruebas backend, 4 frontend y build de Vite aprobados.`

## Respaldo local anterior

El remoto reemplazó su historial. Antes de integrar se conservaron los archivos anteriores fuera del repositorio, en `../respaldo-registro-20260921`, y en un stash con el mensaje `Respaldo registro Lucas antes de integrar login 2026-09-21`. La rama `respaldo/registro-antes-login-20260921` conserva el punto de partida antiguo. No aplicar ese stash sobre la entrega integrada: contiene las versiones anteriores de los archivos compartidos.
