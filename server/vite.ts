import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Vite middleware'ini Express'e ekle
  app.use(vite.middlewares);

  // SPA için catch-all route, index.html dosyasını dinamik olarak okur ve HMR cache bypass için nanoid ekler
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.url.startsWith("file://") ? new URL(import.meta.url).pathname : "",
        "..",
        "client",
        "index.html"
      );

      // index.html dosyasını dosyadan oku
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      // cache'i aşmak için script src'ye nanoid parametresi ekle
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      // Vite'nin HTML transformasyonunu uygula (HMR vs için)
      const page = await vite.transformIndexHtml(url, template);

      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Build sonrası dosyalar dist/public altında olur
  const distPath = path.resolve(
    import.meta.url.startsWith("file://") ? new URL(import.meta.url).pathname : "",
    "..",
    "dist",
    "public"
  );

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // Statik dosyaları sun
  app.use(express.static(distPath));

  // Dosya bulunamazsa index.html'i gönder (SPA)
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
