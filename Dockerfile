# 1. Build aşaması
FROM node:20 AS builder

WORKDIR /app

# Tüm proje içeriğini kopyala
COPY . .

# client dizinine geç ve bağımlılıkları kur
WORKDIR /app/client
RUN npm install
RUN npm run build

# 2. Production aşaması
FROM node:20

WORKDIR /app

# Serve modülünü yükle
RUN npm install -g serve

# build çıktısını kopyala
COPY --from=builder /app/client/dist ./dist

# Render otomatik PORT verir
ENV PORT 8080

# Sunucuyu başlat
CMD ["serve", "-s", "dist", "-l", "0.0.0.0:${PORT}"]
