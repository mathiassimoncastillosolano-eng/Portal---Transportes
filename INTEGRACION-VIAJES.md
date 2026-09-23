# Búsqueda, tipos de servicio y detalle de viajes

Integra la búsqueda de Karina con los requisitos de Mayte sobre main `9497631`.

## Comportamiento

- La búsqueda conserva origen, destino, fecha y horario y permite seleccionar varios tipos de servicio. Los tipos se combinan con OR entre sí y con AND respecto de la búsqueda. «Todos» elimina únicamente el filtro de servicio.
- Los filtros quedan en la URL. Cambiar el horario conserva los tipos; iniciar una nueva búsqueda limpia los filtros. Las respuestas antiguas no reemplazan búsquedas más recientes.
- Los tipos se consultan en `tipo_bus`; no se inventan opciones ni viajes.
- «Ver detalle» consulta el viaje nuevamente y muestra fechas de salida y llegada, duración con minutos, tipo, comodidades, precio desde y cantidad de asientos disponibles. Se actualiza también antes de avanzar a selección de asientos.
- Solo se cuentan asientos `DISPONIBLE` y se toma su precio mínimo. Sin inventario o sin cupos, el contador es cero, no se inventa precio y se bloquea la selección. Menos de diez asientos se muestran como últimos asientos.
- Se mantienen los filtros de elegibilidad de Karina: viajes programados, programación/ruta/agencias/ubicaciones/bus activos. Un detalle inexistente o no elegible devuelve 404.
- Se reutiliza el repositorio de consultas existente. No se importan entidades duplicadas ni mapeos Integer incompatibles del ZIP.

## API pública

`GET /api/viajes/buscar?origen=Lima&destino=Cusco&fecha=2026-09-23&horario=noche&tipoServicio=Prime&tipoServicio=Bus%20Cama`

`GET /api/viajes/tipos-bus`

`GET /api/viajes/{id}`

La respuesta de búsqueda y detalle conserva el contrato de `ViajeResumenDto`, incluyendo ID Long, fechas, disponibilidad, precio y servicios.

## Configuración y ejecución

Desde `backend`, copiar `.env.properties.example` a `.env.properties` y completar las credenciales autorizadas de Supabase y JWT. El archivo real está excluido de Git. En la computadora de Lucas quedó preparado localmente. No publicar ese archivo.

Primera terminal desde `backend`: `./mvnw.cmd spring-boot:run`.

Segunda terminal desde la raíz: `npm.cmd run dev`. En la computadora de Lucas, si npm no está en PATH, puede usarse `../Iniciar-web.cmd`.

La API se configura mediante `VITE_API_URL`; el valor predeterminado es `http://localhost:8080`. Se conserva `ddl-auto=validate` y no se ejecutan scripts de datos de prueba del ZIP en Supabase.

## Validación

- 17 pruebas Java aprobadas: contexto, registro/login/perfil, búsquedas y detalle; incluyen múltiples tipos combinados con fecha/ciudades/horario, cruce de medianoche, conteos sin duplicados, agotados, ausencia de inventario y viajes inactivos.
- 9 pruebas de servicios frontend y validación de registro aprobadas.
- Compilación Vite de producción correcta.
- Arranque real contra Supabase en modo validate y consultas HTTP de catálogo, detalle y búsqueda verificadas.
- Comprobación en navegador de detalle sin cupos, tipos sin coincidencias y selección múltiple; pruebas de solo lectura sobre Supabase.

Para repetir las pruebas: `./mvnw.cmd test` desde backend; `npm.cmd test` y `npm.cmd run build` desde la raíz.

## Límite del alcance

La previsualización de disponibilidad está conectada a Supabase. La reserva, el mapa interactivo de asientos y el pago continúan siendo módulos de demostración previos: esta entrega no implementa bloqueo, compra ni confirmación transaccional de asientos. La consulta de disponibilidad no reserva un cupo.
