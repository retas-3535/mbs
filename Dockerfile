# 1. Node image (build için)
FROM node:20 AS builder

# Çalışma dizini
WORKDIR /app

# Paket dosyalarını kopyala
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install

# Projeyi derle
COPY client ./
RUN npm run build

# 2. Production image (sadece static dosyaları sunar)
FROM node:20

WORKDIR /app

# Serve modülünü kur (vite preview yerine)
RUN npm install -g serve

# build dizinini kopyala
COPY --from=builder /app/client/dist ./dist

# Uygulamayı başlat
CMD ["serve", "-s", "dist", "-l", "4173"]
