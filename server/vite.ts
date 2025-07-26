import path from "path";
import { createServer as createViteServer, ViteDevServer } from "vite";
import serveStatic from "serve-static";
import { Express } from "express";
import { createLogger, transports, format } from "winston";

let vite: ViteDevServer | null = null;

export async function setupVite(app: Express) {
  if (process.env.NODE_ENV === "production") {
    vite = null;
    return;
  }

  vite = await createViteServer({
    server: { middlewareMode: "ssr" },
    appType: "custom",
  });

  app.use(vite.middlewares);
}

export const serveStaticMiddleware = serveStatic(
  path.resolve(__dirname, "../public"),
  { index: false }
);

const logger = createLogger({
  level: "info",
  format: format.combine(format.colorize(), format.simple()),
  transports: [new transports.Console()],
});

export function log(message: string) {
  logger.info(message);
}
