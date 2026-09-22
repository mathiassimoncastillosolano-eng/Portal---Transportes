# RutaLibre — Portal de Transportes

React + Vite → API Spring Boot → PostgreSQL en Supabase.

La búsqueda por origen, destino, fecha y horario consulta la base real. También están integrados registro/login/perfil, destinos y tipos de bus. El mapa de asientos, la compra, los pagos y los pasajes de demostración siguen pendientes de integración; esta entrega cubre las dos tareas de búsqueda de Karina y Lucas.

## Ejecutar

Requisitos: Node.js 20 o posterior y JDK 17 o posterior. Se verificó con Node 24 y JDK 25. El backend usa Maven Wrapper.

1. En `backend/`, copiar `.env.properties.example` como `.env.properties` y completar la contraseña de Supabase y un secreto JWT propio. El archivo local se excluye de Git. Para generar el secreto puede utilizarse `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
2. Abrir una terminal dentro de `backend/` y ejecutar:

```powershell
.\mvnw.cmd spring-boot:run
```

3. En otra terminal, desde la raíz del proyecto:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abrir http://localhost:5173. El backend usa http://localhost:8080. Iniciar siempre ambas terminales desde la misma copia del proyecto.

El backend importa `.env.properties` desde su directorio de ejecución. En despliegue se pueden usar `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET` y `CORS_ORIGENES` sin crear ese archivo. El frontend admite `VITE_API_URL` mediante `.env`; copiar `.env.example` si se necesita otra URL. Las variables Vite se incorporan al compilar: no colocar contraseñas ni claves privadas en ellas.

Se mantiene `spring.jpa.hibernate.ddl-auto=validate`: el arranque comprueba el esquema existente y no crea ni altera tablas. El Transaction Pooler utiliza puerto 6543, `prepareThreshold=0`, SSL y un máximo de tres conexiones por instancia. La configuración se contrastó con [Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

## API de búsqueda

```text
GET /api/viajes/buscar?origen=Lima&destino=Cusco&fecha=2026-09-23&horario=mañana
```

`origen`, `destino` y `fecha` son obligatorios. Se ignoran mayúsculas/minúsculas y espacios exteriores en las ciudades. No se permite el mismo origen y destino. `horario` es opcional:

| Horario | Intervalo de salida |
| --- | --- |
| cualquiera | Todo el día |
| madrugada | 00:00 a antes de 06:00 |
| mañana / manana | 06:00 a antes de 12:00 |
| tarde | 12:00 a antes de 19:00 |
| noche | 19:00 a antes de 24:00 |

Una búsqueda sin coincidencias devuelve `200` y `[]`. Parámetros incompletos, fechas inválidas y horarios desconocidos devuelven `400` con `mensaje`. La API de consulta permite fechas históricas; el formulario ofrece fechas desde hoy. La consulta considera viajes `PROGRAMADO` y ubicaciones, agencias, rutas, programaciones y buses activos.

La respuesta contiene `id`, `empresa`, `origen`, `destino`, `fechaSalida`, `horaSalida`, `horaLlegada`, `fechaLlegada`, `duracion`, `tipoBus`, `servicios`, `asientosDisponibles`, `precio` y `estado`. `empresa` conserva la marca del portal, RutaLibre: la base no contiene una entidad de empresa transportista. Los asientos se cuentan desde `viaje_asiento`, solo en estado `DISPONIBLE`; los bloqueados no se liberan desde esta consulta. El precio es el menor de los asientos disponibles. Si no hay cupos, `precio` es `null` y el viaje queda `agotado`. Una duración no informada no genera una hora de llegada ficticia.

## Pruebas

```powershell
npm.cmd test
npm.cmd run build
```

Desde `backend/`:

```powershell
.\mvnw.cmd test
```

Las pruebas Java usan H2 y el perfil `test`, sin escribir en Supabase. Incluyen las pruebas previas de registro y seis pruebas de búsqueda: conteos con varios servicios por bus, extremos de horarios, validaciones, exclusión de inactivos/cancelados, ausencia de asientos/duración y CORS.

Validación del 22/09/2026: 15 pruebas Java y 8 JavaScript aprobadas, compilación de producción completada y comprobación de solo lectura contra Supabase. El esquema de pruebas refleja `ubicacion.id_ubicacion` como `bigint`, igual que la base real.

## Datos disponibles para verificar

En la verificación del 22/09/2026, Lima → Cusco el 23/09/2026 devolvió:

| ID | Salida | Tipo | Asientos disponibles | Precio desde |
| --- | --- | --- | ---: | ---: |
| 7 | 03:30 | Estándar | 36 | S/ 55.00 |
| 10 | 07:30 | Semi Cama | 36 | S/ 75.00 |
| 13 | 13:30 | Bus Cama | 32 | S/ 95.00 |
| 16 | 20:30 | Prime | 28 | S/ 125.00 |

Los registros consultados llegan hasta el 23/09/2026. Para otra fecha sin viajes, el resultado vacío es correcto; no se generan salidas automáticamente. No se insertaron ni modificaron registros durante esta entrega.

## Antes de subir o desplegar

- La base de esta entrega es el commit `f0df2f7` de `main`, con los últimos cambios de registro, login, destinos y servicios presentes al iniciar la revisión.
- La contraseña de base de datos estaba versionada en la configuración original. Se retiró de los archivos de esta entrega, pero sigue en el historial remoto: el responsable de Supabase debe rotarla y actualizar la configuración de los integrantes.
- Revisar los cambios en una rama y ejecutar las pruebas antes de publicar. Nunca agregar `.env.properties` o `.env` a Git.
- Un despliegue público completo requiere integrar y probar reservas, asientos, pagos y boletos; esas tareas están fuera del alcance confirmado de esta entrega.
