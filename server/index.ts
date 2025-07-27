import express, { type Request, type Response, type NextFunction } from "express";
import { createServer as createHttpServer } from "http";
import { fileURLToPath } from "url";
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// ES modül için __dirname ve __filename tanımla
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createHttpServer(app);

// JSON gövde limitini artır
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Basit API istek günlüğü middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: any;
  
  const originalJson = res.json;
  res.json = function (body, ...args) {
    capturedJsonResponse = body;
    return originalJson.apply(this, [body, ...args]);
  };
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let message = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        message += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (message.length > 120) {
        message = message.slice(0, 117) + "...";
      }
      log(message);
    }
  });
  next();
});

// Health check endpoint - Render.com için önemli
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API rotalarını kaydet
await registerRoutes(app);

// Hata yakalayıcı middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  log(`${status} Error: ${message}`, "error");
});

// Vite dev server (sadece dev ortamında)
if (process.env.NODE_ENV === "development") {
  await setupVite(app, server);
} else {
  serveStatic(app, __dirname);
}

// Uygulama portu (Render.com için PORT env değişkeni gerekir)
const PORT = parseInt(process.env.PORT || "3000", 10);

server.listen(PORT, "0.0.0.0", () => {
  log(`🚀 Server listening on http://localhost:${PORT}`);
  log(`📱 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    log('Process terminated');
  });
});

process.on('SIGINT', () => {
  log('SIGINT received, shutting down gracefully');
  server.close(() => {
    log('Process terminated');
  });
});
