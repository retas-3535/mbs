# 1. Node imajını kullan
FROM node:20-alpine

# 2. Çalışma dizinini ayarla
WORKDIR /app

# 3. Bağımlılık dosyalarını kopyala
COPY client/package.json client/package-lock.json ./client/

# 4. Bağımlılıkları yükle
WORKDIR /app/client
RUN npm install

# 5. Kaynak kodları kopyala
WORKDIR /app
COPY . .

# 6. Uygulamayı derle
WORKDIR /app/client
RUN npm run build

# 7. Geliştirme sunucusunu başlat (opsiyonel olarak servis edilecekse)
EXPOSE 4173

# 8. Vite preview sunucusunu çalıştır
CMD ["npm", "run", "preview"]
