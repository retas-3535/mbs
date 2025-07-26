# 1. Build aşaması
FROM node:20 AS builder

WORKDIR /app

# package.json ve diğer dosyaları kopyala
COPY . .

# Bağımlılıkları yükle ve uygulamayı derle
RUN npm install
RUN npm run build

# 2. Production aşaması
FROM node:20

WORKDIR /app

# Serve modülünü yükle (basit statik sunucu)
RUN npm install -g serve

# build klasörünü kopyala (örneğin: client/dist veya dist/client olabilir)
COPY --from=builder /app/client/dist ./dist

# Render özelinde port 8080 sabittir
ENV PORT 8080

# Uygulamayı başlat
CMD ["serve", "-s", "dist", "-l", "0.0.0.0:8080"]
