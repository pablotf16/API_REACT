1. Prerrequisitos
Tener instalado Node.js (versión 16 o superior).

2. Crear el Proyecto
Abre tu terminal y ejecuta los siguientes comandos para crear una estructura base con Vite y React:
gi
Bash

npm create vite@latest workout-tracker -- --template react
cd workout-tracker
npm install
3. Instalar Dependencias
Instala Firebase y las herramientas para Tailwind CSS (los estilos que usa el proyecto):

Bash

npm install firebase
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
4. Configurar Tailwind CSS
Abre el archivo tailwind.config.js que se creó y reemplaza content para que detecte tus archivos:

JavaScript

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
Abre el archivo src/index.css y reemplaza todo su contenido por las directivas de Tailwind:

CSS

@tailwind base;
@tailwind components;
@tailwind utilities;
(Nota: El archivo original usaba @import "tailwindcss";, pero la configuración estándar local suele requerir las directivas @tailwind).

5. Configurar Archivos del Proyecto
Crea la estructura de carpetas y archivos copiando el código que tienes.

Estructura de carpetas necesaria:

Plaintext

src/
├── components/
│   ├── StatCard.jsx
│   └── WorkoutItem.jsx
├── services/
│   └── gridService.js
├── App.jsx
├── main.jsx
└── index.css
Copia el contenido de src/components/StatCard.jsx y src/components/WorkoutItem.jsx en sus respectivos archivos.

Copia src/services/gridService.js.

Copia src/main.jsx.

6. Ajuste Crítico: src/App.jsx y Firebase
El archivo src/App.jsx está esperando variables globales (__firebase_config) que no existen en tu entorno local. Debes modificar las líneas iniciales de src/App.jsx.

Reemplaza esto:

JavaScript

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
// ...
Por esto (Usa tu propia configuración de Firebase):

JavaScript

// 1. Ve a la consola de Firebase > Project Settings > General > Your apps
// 2. Copia el objeto firebaseConfig y pégalo aquí:
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

const appId = "my-local-app"; // Puedes poner cualquier string identificador
const initialAuthToken = null;
7. Ejecutar la Aplicación
Una vez guardados los cambios, ejecuta el servidor de desarrollo:

Bash

npm run dev
La terminal te mostrará una URL (ej. http://localhost:5173/). Abre esa dirección en tu navegador y deberías ver la aplicación funcionando.