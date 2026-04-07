# 🧘 StretchLibrary

**App de biblioteca de estiramientos con IA** — Guarda, organiza y comparte videos de estiramientos por categorías. Crea planes de estiramientos personalizados con Gemini AI.

## ✨ Características

- **📚 Biblioteca de estiramientos** — Guarda videos de Instagram, YouTube, TikTok o cualquier URL
- **🤖 Análisis con Gemini AI** — Analiza automáticamente los videos y extrae categoría, nivel, músculos, etc.
- **📂 Categorías** — Organiza por: cuello, hombros, espalda, pecho, brazos, caderas, piernas, tobillos, full body
- **📋 Planes de estiramientos** — Genera planes inteligentes con IA basados en tus estiramientos guardados
- **📤 Compartir** — Comparte estiramientos y planes con amigos (Web Share API)
- **📝 Añadir manualmente** — También puedes añadir estiramientos sin IA
- **🔍 Búsqueda** — Busca por nombre, categoría, músculos o tags
- **📱 PWA instalable** — Instala como app nativa en tu móvil
- **🔒 API segura** — La clave de API se guarda en el servidor, nunca expuesta al cliente

## 🚀 Inicio Rápido

### Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- Clave de API de [Google AI Studio](https://aistudio.google.com/app/apikey) (gratuita)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/martamateu/mi-fit-library.git
cd mi-fit-library

# Instalar dependencias
npm install

# Configurar la clave de API
cp .env.example .env
# Edita .env y añade tu GEMINI_API_KEY

# Iniciar el servidor
npm start
```

La app estará disponible en `http://localhost:3000`.

### Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `GEMINI_API_KEY` | Clave de API de Google Gemini (gratuita) | Sí |
| `PORT` | Puerto del servidor (por defecto: 3000) | No |

## 🏗️ Arquitectura

```
├── server.js           # Backend Express con proxy seguro para Gemini API
├── package.json        # Dependencias del proyecto
├── .env.example        # Plantilla de variables de entorno
├── .gitignore          # Archivos ignorados por git
└── public/             # Frontend estático (PWA)
    ├── index.html      # Página principal
    ├── styles.css      # Estilos
    ├── app.js          # Lógica de la aplicación
    ├── manifest.json   # Manifiesto PWA
    └── sw.js           # Service Worker
```

### Seguridad de la API

- La clave de API de Gemini se almacena **solo en el servidor** como variable de entorno
- **Nunca se expone al navegador** del usuario
- El servidor actúa como proxy seguro entre el cliente y la API de Gemini
- Rate limiting: máximo 20 peticiones por minuto por IP
- Helmet.js para cabeceras de seguridad HTTP
- Validación de entradas en el servidor

## 📱 Uso

1. **Añadir estiramiento**: Pulsa "+ Añadir" y pega una URL de video o añade manualmente
2. **Filtrar por categoría**: Usa las chips de categoría para filtrar
3. **Buscar**: Escribe en el buscador para encontrar estiramientos
4. **Generar plan**: Ve a "Planes" y pulsa "Generar Plan con IA"
5. **Compartir**: Usa el botón 📤 en cualquier estiramiento o plan
6. **Recibir compartidos**: Comparte URLs desde otras apps y se abrirá StretchLibrary

## 🛠️ Tecnologías

- **Frontend**: Vanilla JS, CSS3, HTML5
- **Backend**: Node.js, Express
- **IA**: Gemini 2.0 Flash (Google AI)
- **Seguridad**: Helmet, express-rate-limit
- **PWA**: Service Worker, Web Share API, Web Share Target
