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
RUN apk add --no-cache libreoffice qpdf ghostscript fontconfig ttf-freefont \
    && fc-cache -f

# Next standalone genera una carpeta self-contained
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Cloud Run espera escuchar en 0.0.0.0:8080
EXPOSE 8080

CMD ["node", "server.js"]
