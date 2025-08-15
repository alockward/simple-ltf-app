# SIMPLE LTF — Backend con GitHub + Vercel

Este paquete contiene una **aplicación de página única (SPA)** y un **endpoint** `/api/submit` (Función de Vercel) que registra las solicitudes en un archivo CSV dentro de un repositorio de GitHub. Cada vez que un usuario envía un formulario desde la SPA, el backend añade una nueva fila al archivo y mantiene un respaldo en `localStorage` en el navegador.

> **Nota**: Esta versión no utiliza Microsoft Lists ni envía correos electrónicos. Si en el futuro deseas integrar con otros servicios (por ejemplo, Microsoft Lists, Excel, correo electrónico o almacenamiento de adjuntos), adapta `api/submit.js` y ajusta las variables de entorno en consecuencia.

## 1) Estructura del proyecto

```
index.html      → Página principal del frontend
styles.css      → Estilos de la SPA
app.js          → Lógica de la SPA (manejo de formularios, localStorage y fetch al backend)
api/submit.js   → Backend (Función de Vercel)
README.md       → Este documento
```

## 2) Variables de entorno (Vercel)

En **Vercel → Project → Settings → Environment Variables** define las siguientes variables:

- **`GITHUB_OWNER`** — Usuario u organización propietaria del repositorio de datos.
- **`GITHUB_REPO`** — Nombre del repositorio donde se almacenarán los envíos (por ejemplo, `simple-ltf-data`).
- **`GITHUB_TOKEN`** — [Token de acceso personal](https://github.com/settings/tokens) con permiso `repo` para crear y actualizar archivos en el repositorio.
- **`GITHUB_FILE_PATH`** — Ruta del archivo CSV (por ejemplo, `submissions.csv`). Si se omite, se utilizará `submissions.csv` por defecto.
- **`ALLOWED_ORIGIN`** — Dominio autorizado para CORS (en desarrollo puede ser `*`).

Estas variables permiten que el backend escriba nuevas filas en el archivo CSV cada vez que se recibe un formulario.

## 3) Desarrollo local

1. Instala [Vercel CLI](https://vercel.com/docs/cli) y Node 18 o superior.
2. Crea un archivo `.env.local` en la raíz del proyecto con las variables de entorno anteriores:

   ```
   GITHUB_OWNER=tu_usuario
   GITHUB_REPO=simple-ltf-data
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
   GITHUB_FILE_PATH=submissions.csv
   ALLOWED_ORIGIN=http://localhost:3000
   ```

3. Ejecuta el proyecto en modo local:

   ```bash
   vercel dev
   ```

4. Abre `http://localhost:3000` en tu navegador, completa un formulario y verifica que el archivo en tu repositorio se actualice con una nueva fila.

## 4) Despliegue en Vercel

1. Sube este proyecto a GitHub.
2. En Vercel, elige **Import Project**, selecciona el repositorio y sigue los pasos.
3. En **Environment Variables**, introduce los valores `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN`, `GITHUB_FILE_PATH` y `ALLOWED_ORIGIN`.
4. Despliega el proyecto. La SPA quedará accesible en el dominio de Vercel y el endpoint `/api/submit` gestionará los envíos.

## 5) Consideraciones de CORS

El backend configura la cabecera `Access-Control-Allow-Origin` utilizando el valor de `ALLOWED_ORIGIN`. Para pruebas locales puedes usar `*`, pero en producción debes definir tu dominio de Vercel para evitar solicitudes desde orígenes no autorizados.

## 6) Integración con el frontend

El archivo `app.js` gestiona la captura de datos, validación de archivos y envíos vía `fetch` a `/api/submit`. Además, conserva las solicitudes en `localStorage` como respaldo. No es necesario modificar la SPA para trabajar con este backend; simplemente asegúrate de desplegar ambos juntos.

## 7) Próximos pasos y extensiones

- **Adjuntos**: Esta versión no guarda archivos adjuntos. Para soportar la subida de archivos, puedes utilizar un servicio como S3 o OneDrive y almacenar la URL en el CSV.
- **Notificaciones**: Si deseas recibir una notificación por correo, puedes implementar un flujo en Power Automate que vigile el repositorio o que reciba un webhook desde el backend.
- **Otras integraciones**: Puedes adaptar la lógica para escribir en una base de datos, Microsoft Lists, Excel o cualquier otro servicio, modificando `api/submit.js` y añadiendo las variables de entorno necesarias.