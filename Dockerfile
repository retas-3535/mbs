# 1. Aşama: Build
FROM node:20 AS builder

WORKDIR /app

# Gerekli dosyaları kopyala
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY attached_assets ./attached_assets

RUN npm install

# Vite build işlemi
RUN npm run build

# 2. Aşama: Servis konteyneri
FROM node:20

WORKDIR /app

# Gerekli dosyaları al
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/attached_assets ./attached_assets

# Servisi başlat
CMD ["node", "dist/index.js"]
