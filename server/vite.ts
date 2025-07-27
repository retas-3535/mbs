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
    let indexPath: string;
    
    if (fs.existsSync(distPath)) {
      indexPath = path.join(distPath, "index.html");
    } else if (fs.existsSync(publicPath)) {
      indexPath = path.join(publicPath, "index.html");
    } else {
      // Fallback
      const fallbackDistPath = path.resolve(process.cwd(), "dist");
      const fallbackPublicPath = path.resolve(process.cwd(), "public");
      
      if (fs.existsSync(fallbackDistPath)) {
        indexPath = path.join(fallbackDistPath, "index.html");
      } else {
        indexPath = path.join(fallbackPublicPath, "index.html");
      }
    }
    
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("404 - Page Not Found");
      log(`404: Could not find index.html at ${indexPath}`, "error");
    }
  });
}
