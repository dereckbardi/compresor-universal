# ============================================================
# COMPRIMEME - Imagen de producción (Next.js standalone + motores)
# ============================================================

# ---------- FASE 1: BUILD ----------
FROM node:22-alpine AS builder
WORKDIR /app

# Copiamos e instalamos dependencias (cachea capa si no cambian)
COPY package.json package-lock.json ./
RUN npm ci

# Copiamos el código y compilamos
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- FASE 2: RUNTIME ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Motores de conversión en runtime
# - libreoffice/qpdf/ghostscript: Office->PDF, proteger, PDF/A
# - poppler-utils (pdftoppm): PDF->PPT (rasteriza páginas)
# - python3 + pip: PyMuPDF (PDF->texto), python-docx (PDF->Word), pdfplumber+openpyxl (PDF->Excel), python-pptx
# Alpine bloquea pip del sistema (PEP 668) -> usar un venv en /opt/venv
# Librerías ligeras (sin opencv) para builds rápidos
RUN apk add --no-cache libreoffice qpdf ghostscript fontconfig ttf-freefont poppler-utils \
    python3 py3-pip py3-pillow py3-numpy \
    && fc-cache -f \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir pymupdf python-docx python-pptx pdfplumber openpyxl pillow \
    && fc-cache -f
ENV PATH="/opt/venv/bin:$PATH"

# Copiamos el script de conversión PDF->Office
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/public ./public

# Next standalone genera una carpeta self-contained
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Cloud Run espera escuchar en 0.0.0.0:8080
EXPOSE 8080

CMD ["node", "server.js"]
