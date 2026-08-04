# COMPRIMEME 🗜️

Comprime y gestiona imágenes y PDFs **100% gratis, sin registro y en tu navegador**. Los archivos se procesan localmente (privacidad total); las conversiones pesadas corren en un backend con motores reales (LibreOffice, qpdf, Ghostscript).

**Web en producción:** https://comprimeme.vercel.app

---

## ✨ Funcionalidades

### Cliente (en el navegador, sin subir archivos)
- **Comprimir imágenes**: JPG, PNG, WebP, GIF
- **PDF**: comprimir, unir, dividir, eliminar páginas, extraer, rotar, recortar, JPG↔PDF
- **Editar PDF**: marca de agua, números de página, censurar (redactar), firmar
- **OCR PDF** (reconocimiento de texto, Tesseract.js) y **Reparar PDF**

### Backend (Cloud Run — LibreOffice, qpdf, Ghostscript)
- **Conversión Office ↔ PDF**: Word, PowerPoint, Excel (y ODF)
- **Seguridad PDF**: proteger / desbloquear con contraseña, convertir a PDF/A
- **HTML → PDF**

## 🛠️ Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 |
| Animaciones | Framer Motion (respectan `prefers-reduced-motion`) |
| Iconos | Phosphor Icons |
| Backend | Docker + LibreOffice, qpdf, Ghostscript (Cloud Run) |
| Deploy | Vercel (frontend) + Cloud Run (backend) |
| Base de datos | Upstash KV (Redis) — suscriptores |
| Emails | Resend |
| PWA | Service Worker + manifest |

## 📄 Páginas

- `/` — Home/landing con animaciones
- `/tools` — catálogo de todas las herramientas
- `/[tool]` — página por herramienta (26 rutas, SEO)
- `/notificar` — panel de administrador para enviar avisos a suscriptores

---

## 🔑 Variables de entorno

Crea un `.env.local` (ver `.env.example`):

```bash
# URL del backend (Cloud Run). Si no se define, usa el valor por defecto.
NEXT_PUBLIC_BACKEND_URL=https://comprimeme-956795747152.us-central1.run.app

# URL canónica del sitio (sitemap/robots)
NEXT_PUBLIC_SITE_URL=https://comprimeme.vercel.app
```

Variables que debe tener el **backend (Cloud Run / Vercel)**:

```bash
# Suscripción (Upstash KV / Redis)
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Avisos por email (Resend)
RESEND_API_KEY=

# Token de administrador del panel /notificar
ADMIN_TOKEN=
```

## 🖥️ Requisitos para correr localmente

- **Node.js 22+**
- Para el backend (conversiones): **LibreOffice**, **qpdf**, **Ghostscript** y **Python 3** con `pdf2docx`, `python-pptx`, `openpyxl`, `pdfplumber`, `pillow` (ver `Dockerfile`)
- **Redis** (Upstash) para la suscripción

## 🚀 Desarrollo

```bash
npm install
npm run dev
```

## 📦 Producción

```bash
npm run build
npm run start
```

## 📬 Suscripción y avisos

- El formulario de suscripción (Home, /tools y pantalla de resultado) guarda emails en **Upstash KV (Redis)** vía `/api/subscribe` (con rate limit anti-spam).
- El panel **/notificar** envía avisos a todos los suscriptores vía `/api/notify` (Resend, envío en lotes de 100).

## 🔒 Seguridad

- Procesamiento en el navegador (los archivos del usuario no se suben a servidores en las herramientas cliente)
- Validación de archivos PDF (magic number `%PDF-`) antes de pasarlos a los motores
- Comparación de token de administrador **timing-safe** (`crypto.timingSafeEqual`)
- **Rate limit** en el endpoint de suscripción (5 intentos/10 min por IP)
- CORS configurado para frontend (Vercel) → backend (Cloud Run)
