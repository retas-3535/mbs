# Düzeltilmiş Dockerfile - npm install kullanarak
FROM node:20-alpine AS builder

WORKDIR /app

# Package dosyalarını kopyala
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./

# npm install kullan (ci yerine) - lock file sorununu çözer
RUN npm install

# Kaynak kodları kopyala
COPY client ./client
COPY server ./server
COPY shared ./shared

# Build işlemini gerçekleştir
RUN npm run build

# Production aşaması
FROM node:20-alpine AS production

WORKDIR /app

# Güvenlik için non-root user oluştur
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Package dosyalarını kopyala
COPY --from=builder /app/package*.json ./

# npm install kullan (production dependencies için)
RUN npm install --only=production

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

# Environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Uygulamayı başlat
CMD ["node", "dist/index.js"]
