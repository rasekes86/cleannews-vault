# 📰 CleanNews Vault

**Extensión de Chrome (Manifest V3) + Web App para extracción y almacenamiento de artículos limpios**

> Extrae el contenido textual limpio de noticias y artículos, elimina ruido visual (publicidad, pop-ups, vídeos, banners), y guárdalo en tu biblioteca personal. 100% local, 100% privado.

---

## 🚀 Funcionalidades

| Función | Descripción |
|---------|-------------|
| 🔍 **Extracción Inteligente** | Detecta y extrae el contenido principal del artículo automáticamente |
| 🧹 **Limpieza de Contenido** | Elimina anuncios, pop-ups, vídeos, banners y elementos decorativos |
| 📚 **Biblioteca Personal** | Guarda artículos organizados con búsqueda interna |
| ✏️ **Edición Manual** | Edita el título, contenido y metadatos de cada artículo |
| 🏷️ **Etiquetas y Categorías** | Organiza tus artículos con etiquetas personalizadas |
| 📤 **Exportación Múltiple** | Exporta a TXT, Markdown, PDF y JSON |
| 🔒 **100% Local** | Todos los datos se almacenan localmente, sin servidores externos |
| 📖 **Modo Lectura** | Vista de lectura limpia y sin distracciones |

## 🏗️ Arquitectura

El proyecto incluye dos componentes:

### 1. Extensión de Chrome (Manifest V3)
- **Content Script**: Analiza el DOM de la página activa y extrae el contenido del artículo
- **Background Script**: Gestiona la comunicación entre content script y popup
- **Popup**: Interfaz principal de la extensión
- **Library Panel**: Vista completa de la biblioteca de artículos
- **Reader**: Vista de lectura limpia en nueva pestaña
- **Storage**: Usa `chrome.storage.local` para persistencia

### 2. Web App (Next.js 16)
- Dashboard con estadísticas
- Vista de extracción con preview en tiempo real
- Biblioteca completa con filtros y búsqueda
- Editor de artículos con vista previa
- API REST con Prisma + SQLite

```
public/extension/
├── manifest.json          # Configuración de la extensión
├── background.js          # Service worker
├── content/
│   ├── content.js         # Content script principal
│   └── readability.js     # Motor de extracción de contenido
├── popup/
│   ├── popup.html         # UI del popup
│   ├── popup.js           # Lógica del popup
│   └── popup.css          # Estilos del popup
├── library/
│   ├── library.html       # Panel de biblioteca
│   ├── library.js         # Lógica de la biblioteca
│   └── library.css        # Estilos
├── reader/
│   ├── reader.html        # Vista de lectura
│   ├── reader.js          # Lógica del reader
│   └── reader.css         # Estilos
├── utils/
│   ├── storage.js         # Gestión de chrome.storage
│   └── export.js          # Exportación TXT/MD/PDF/JSON
└── icons/                 # Iconos de la extensión
```

## 🛠️ Tech Stack

- **Extensión**: JavaScript puro (Manifest V3), chrome.storage API
- **Web App**: Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma, SQLite
- **Almacenamiento**: chrome.storage.local (extensión) / SQLite (web app)
- **Exportación**: JSZip, jsPDF, Markdown, JSON nativo

## 📦 Instalación de la Extensión

1. Descarga o clona este repositorio
2. Abre Chrome y ve a `chrome://extensions/`
3. Activa **"Modo de desarrollador"** (esquina superior derecha)
4. Haz clic en **"Cargar descomprimida"**
5. Selecciona la carpeta `public/extension/`
6. ¡Listo! Verás el icono de CleanNews Vault en tu barra de extensiones

## 🖥️ Instalación de la Web App

```bash
# Instalar dependencias
bun install

# Iniciar base de datos
bun run db:push

# Ejecutar en modo desarrollo
bun run dev
```

## 📋 Cómo Usar

1. **Navega** a cualquier artículo o noticia en tu navegador
2. **Haz clic** en el icono de CleanNews Vault
3. **Extrae** el contenido limpio con un solo clic
4. **Guarda** el artículo en tu biblioteca personal
5. **Organiza** con etiquetas y categorías
6. **Busca** en tu biblioteca cuando lo necesites
7. **Exporta** en el formato que prefieras

## 📄 Exportación de Artículos

| Formato | Descripción |
|---------|-------------|
| `.txt` | Texto plano limpio |
| `.md` | Markdown con formato |
| `.pdf` | Documento PDF formateado |
| `.json` | Datos estructurados |

## 🔐 Privacidad

- **Cero servidores**: Todos los datos se almacenan localmente en tu navegador
- **Sin tracking**: No se recopila ninguna información de uso
- **Sin telemetría**: Sin analytics ni métricas
- **Sin conexión a internet**: La extensión funciona completamente offline

## 📜 Licencia

MIT License - Libre para uso personal y comercial.

---

**Desarrollado con ❤️ por [rasekes86](https://github.com/rasekes86)**
