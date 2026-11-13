# Vista de ejemplo: compra con un pasaje cambiado

Esta vista muestra cómo quedaría una compra de tres boletos si solo el segundo cambiara de viaje. Los datos y el pago adicional son ilustrativos. No consulta ni modifica la base de datos.

Para verla en local:

1. En `frontend-Portal`, ejecutar `npm install` y `npm run dev`.
2. Abrir `/vista-detalle-compra.html` para la compra original.
3. Abrir `/vista-detalle-compra-cambiado.html` para el resultado propuesto y su PDF.

Los archivos HTML de demostración no forman parte de la compilación de producción. La aplicación real seguirá usando los datos que entregue el backend para el detalle de compra y el PDF.

En el portal local, entra a **Mis pasajes** y abre **Compra de prueba · 3 boletos**. Desde su detalle puedes iniciar el cambio de cualquiera de los tres boletos. Al confirmar, **Ver compra actualizada** muestra el viaje vigente de cada boleto y permite descargar un PDF de prueba generado con esos datos. Este recorrido solo aparece con `npm run dev` y el estado se reinicia al recargar la página.
