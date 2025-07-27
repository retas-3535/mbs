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

  // Client klasörü yolları
  const clientDistPath = resolve("../client/dist");
  const clientPublicPath = resolve("../client/public");
  const clientPath = resolve("../client");
  
  // Fallback yolları
  const distPath = resolve("../dist");
  const publicPath = resolve("../public");

  log(`Checking client paths:`);
  log(`  Client dist: ${clientDistPath} - ${fs.existsSync(clientDistPath) ? 'EXISTS' : 'NOT FOUND'}`);
  log(`  Client public: ${clientPublicPath} - ${fs.existsSync(clientPublicPath) ? 'EXISTS' : 'NOT FOUND'}`);
  log(`  Client root: ${clientPath} - ${fs.existsSync(clientPath) ? 'EXISTS' : 'NOT FOUND'}`);

  // Önce client/dist, sonra client/public, sonra client klasörünü kontrol et
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    log(`Static files served from: ${clientDistPath}`);
  } else if (fs.existsSync(clientPublicPath)) {
    app.use(express.static(clientPublicPath));
    log(`Static files served from: ${clientPublicPath}`);
  } else if (fs.existsSync(clientPath)) {
    app.use(express.static(clientPath));
    log(`Static files served from: ${clientPath}`);
  } else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    log(`Static files served from: ${distPath}`);
  } else if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
    log(`Static files served from: ${publicPath}`);
  } else {
    log("Warning: Could not find any static files directory", "error");
  }

  // SPA routing için catch-all route
  app.get("*", (req, res) => {
    // Client klasöründeki olası lokasyonları kontrol et
    const possiblePaths = [
      path.resolve(process.cwd(), "client", "dist", "index.html"),
      path.resolve(process.cwd(), "client", "public", "index.html"), 
      path.resolve(process.cwd(), "client", "index.html"),
      resolve("../client/dist/index.html"),
      resolve("../client/public/index.html"),
      resolve("../client/index.html"),
      resolve("../dist/index.html"),
      resolve("../public/index.html")
    ];
    
    let indexPath: string | null = null;
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        indexPath = possiblePath;
        log(`Found index.html at: ${indexPath}`);
        break;
      }
    }
    
    if (indexPath && fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Eğer index.html bulunamazsa, basit bir HTML döndür
      const fallbackHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MBS App</title>
</head>
<body>
    <div id="root">
        <h1>MBS Server is running! 🚀</h1>
        <p>Frontend files not found, but server is working.</p>
        <div id="health-check">Checking API...</div>
    </div>
    <script>
        // API health check
        fetch('/api/health')
          .then(r => r.json())
          .then(data => {
            document.getElementById('health-check').innerHTML = 
              '<p style="color: green;">✅ API Status: ' + data.status + '</p>' +
              '<p>Message: ' + data.message + '</p>';
          })
          .catch(err => {
            document.getElementById('health-check').innerHTML = 
              '<p style="color: red;">❌ API Error: ' + err.message + '</p>';
          });
    </script>
</body>
</html>`;
      
      res.send(fallbackHtml);
      log(`Could not find index.html in any of these paths: ${possiblePaths.join(', ')}`, "error");
    }
  });
}
