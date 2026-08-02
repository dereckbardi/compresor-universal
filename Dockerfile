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

# ---------- FASE 2: RUNTIME (Debian para motores completos) ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Motores de conversión en runtime
# - libreoffice (Debian trae importador de PDF): Office->PDF y PDF->Office con estructura
# - qpdf/ghostscript: proteger/desbloquear, PDF/A
# - poppler-utils (pdftoppm): PDF->PPT (rasteriza páginas)
# - python3 + pip + pdf2docx (PDF->Word con estructura/imágenes/texto editable), python-pptx, openpyxl
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer libreoffice-calc libreoffice-impress \
    qpdf ghostscript poppler-utils python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir --break-system-packages pdf2docx python-pptx openpyxl pdfplumber pillow \
    && fc-cache -f 2>/dev/null || true
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
