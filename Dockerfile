# Multi-stage Dockerfile - Winston Hatası Çözümü
FROM node:20-alpine AS builder

# Build aşaması için gerekli araçları yükle
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Package dosyalarını kopyala
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./

# İlk olarak dependencies'leri yükle (cache için)
RUN npm ci

# Kaynak kodları kopyala
COPY client ./client
COPY server ./server
COPY shared ./shared

# Winston'ı eksplisit olarak yükle
RUN npm install winston

# Build işlemini gerçekleştir
RUN npm run build

# Dependencies'leri listele (debug için)
RUN echo "=== Installed packages ===" && npm list --depth=0 || true

# Production aşaması
FROM node:20-alpine AS production

WORKDIR /app

# Güvenlik için non-root user oluştur
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Package dosyalarını kopyala
COPY --from=builder /app/package*.json ./

# Production dependencies'leri yükle
RUN npm ci --only=production && npm cache clean --force

# Winston'ı production'da da yükle (eğer dependencies'de yoksa)
RUN npm install winston

# Build edilmiş dosyaları kopyala
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# Logs dizini oluştur
RUN mkdir -p /app/logs && chown -R appuser:nodejs /app/logs

# Gerekli izinleri ver
RUN chown -R appuser:nodejs /app

# Non-root user'a geç
USER appuser

# Port'u expose et
EXPOSE 10000

# Health check ekle
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "try { require('http').get('http://localhost:10000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1)); } catch(e) { process.exit(1); }" || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Graceful shutdown için init sistemi
RUN apk add --no-cache dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Uygulamayı başlat
CMD ["node", "dist/index.js"]
