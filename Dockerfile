# -------------------
# 1. Build React Client (Vite)
# -------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Bağımlılıkları yükle
COPY package.json package-lock.json ./
COPY client ./client
COPY shared ./shared

# Client bağımlılıkları yükle ve build et
RUN npm install && npm run build --workspace=client

# -------------------
# 2. Run Express Server with Built Files
# -------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Yalnızca production için gerekli dosyaları kopyala
COPY package.json package-lock.json ./
COPY server ./server
COPY shared ./shared

# Sadece server bağımlılıkları yüklensin
RUN npm install --only=production

# Client tarafında build edilmiş dosyaları dist içine kopyala
COPY --from=builder /app/client/dist ./dist

# Port Render.com'a uygun olmalı
ENV PORT=10000

# Uygulamayı başlat
CMD ["node", "server/index.js"]
