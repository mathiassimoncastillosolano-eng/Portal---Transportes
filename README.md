# RutaLibre — Portal Web de Agencia de Transporte Terrestre

Portal web comercial (frontend) para una agencia de transporte terrestre
de pasajeros, construido con **React + Vite**. toda la funcionalidad
(búsqueda de pasajes, inicio de sesión, registro, compra de pasajes,
tickets electrónicos).

## Cómo ejecutar el proyecto

```bash
npm install
npm run dev
```

Luego abre la URL que muestra la terminal (por defecto `http://localhost:5173`).


## Cuenta de demostración

Para probar el flujo de perfil sin registrarte, usa el botón
**"Usar cuenta de demostración"** dentro del formulario de inicio de
sesión, o ingresa manualmente:

- Correo: `demo@rutalibre.pe`
- Contraseña: `demo1234`

Esta cuenta ya trae pasajes y tickets de ejemplo precargados.

## Estructura del proyecto

```text
src/
├── componentes/     Componentes reutilizables, organizados por dominio
├── paginas/         Vistas de cada ruta de la aplicación
├── layouts/         Layouts compartidos (principal y de perfil)
├── rutas/           Definición central de rutas y protección de rutas
├── datos/           Datos simulados (destinos, servicios, empresas, etc.)
├── servicios/       "Servicios" simulados en frontend (auth y viajes)
├── contexto/        Contexto global de autenticación
├── hooks/           Hooks reutilizables
├── utilidades/       Funciones de formato compartidas
├── tipos/           Definiciones de tipos (JSDoc)
└── estilos/         Tokens de diseño y estilos globales

backend/             Carpetas vacías, preparadas para una futura
                     integración con un backend real.
```