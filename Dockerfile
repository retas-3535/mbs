# 1. Build aşaması
FROM node:20 AS builder

WORKDIR /app

COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install

COPY client ./
RUN npm run build

# 2. Production aşaması
FROM node:20

WORKDIR /app

# Serve modülünü kur
RUN npm install -g serve

# build dizinini kopyala
COPY --from=builder /app/client/dist ./dist

# ENV'den gelen portu dinle
ENV PORT 8080

# Render tarafından verilen portta dinleme yap
CMD ["serve", "-s", "dist", "-l", "0.0.0.0:${PORT}"]
