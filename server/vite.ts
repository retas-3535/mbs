import express, { type Express } from "express";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// ES modül için __dirname tanımla
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const log = (message: string, level: "info" | "error" = "info") => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  
  if (level === "error") {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
};

export async function setupVite(app: Express, server: any) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  
  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);
  
  return vite;
}

export function serveStatic(app: Express, serverDirname?: string) {
  const resolve = (p: string) => {
    if (serverDirname) {
      return path.resolve(serverDirname, p);
    }
    return path.resolve(process.cwd(), p);
  };

  // Build edilmiş dosyaları serve et
  const distPath = resolve("../dist");
  const publicPath = resolve("../public");
  
  // Önce dist klasörünü kontrol et
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    log(`Static files served from: ${distPath}`);
  } else if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
    log(`Static files served from: ${publicPath}`);
  } else {
    // Fallback: process.cwd() kullan
    const fallbackDistPath = path.resolve(process.cwd(), "dist");
    const fallbackPublicPath = path.resolve(process.cwd(), "public");
    
    if (fs.existsSync(fallbackDistPath)) {
      app.use(express.static(fallbackDistPath));
      log(`Static files served from: ${fallbackDistPath}`);
    } else if (fs.existsSync(fallbackPublicPath)) {
      app.use(express.static(fallbackPublicPath));
      log(`Static files served from: ${fallbackPublicPath}`);
    } else {
      log("Warning: Could not find static files directory", "error");
    }
  }

  // SPA routing için catch-all route
  app.get("*", (req, res) => {
    // Birden fazla olası lokasyonu kontrol et
    const possiblePaths = [
      path.join(distPath, "index.html"),
      path.join(publicPath, "index.html"),
      path.resolve(process.cwd(), "dist", "index.html"),
      path.resolve(process.cwd(), "public", "index.html"),
      path.resolve(process.cwd(), "client", "dist", "index.html"),
      path.resolve(process.cwd(), "client", "public", "index.html"),
      path.resolve(process.cwd(), "src", "index.html"),
      "/app/client/dist/index.html",
      "/app/client/public/index.html",
      "/app/public/index.html"
    ];
    
    let indexPath: string | null = null;
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        indexPath = possiblePath;
        break;
      }
    }
    
    if (indexPath && fs.existsSync(indexPath)) {
      log(`Serving index.html from: ${indexPath}`);
      res.sendFile(indexPath);
    } else {
      // Eğer index.html bulunamazsa, basit bir HTML döndür
      const fallbackHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App</title>
</head>
<body>
    <div id="root">Loading...</div>
    <script>
        // API health check
        fetch('/api/health')
          .then(r => r.json())
          .then(data => {
            document.getElementById('root').innerHTML = 
              '<h1>Server is running!</h1><p>Status: ' + data.status + '</p><p>Message: ' + data.message + '</p>';
          })
          .catch(err => {
            document.getElementById('root').innerHTML = 
              '<h1>Server is running but no frontend found</h1><p>Error: ' + err.message + '</p>';
          });
    </script>
</body>
</html>`;
      
      res.send(fallbackHtml);
      log(`Could not find index.html in any of these paths: ${possiblePaths.join(', ')}`, "error");
    }
  });
}
