import path from "path";
import { createServer as createViteServer, ViteDevServer } from "vite";
import serveStatic from "serve-static";
import { Express } from "express";
import { Server } from "http";
import { createLogger, transports, format } from "winston";

let vite: ViteDevServer | null = null;

export async function setupVite(app: Express, server: Server) {
  if (process.env.NODE_ENV !== "development") return;

  vite = await createViteServer({
    server: { middlewareMode: "ssr", httpServer: server },
    appType: "custom",
  });

  app.use(vite.middlewares);
}

export function serveStatic(app: Express) {
  const staticPath = path.resolve(__dirname, "../public");
  app.use(serveStatic(staticPath, { index: false }));
}

const logger = createLogger({
  level: "info",
  format: format.combine(format.colorize(), format.simple()),
  transports: [new transports.Console()],
});

export function log(message: string, level: "info" | "error" = "info") {
  if (level === "error") {
    logger.error(message);
  } else {
    logger.info(message);
  }
}
