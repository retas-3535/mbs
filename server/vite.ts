// server/vite.ts
import express from 'express'
import { createServer as createViteServer, ViteDevServer } from 'vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import serveStatic from 'serve-static'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function createServer(isProd = process.env.NODE_ENV === 'production') {
  const app = express()
  let vite: ViteDevServer | undefined

  const resolve = (p: string) => path.resolve(__dirname, '..', p)

  if (!isProd) {
    // Geliştirme ortamı: Vite middleware kullan
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })
    app.use(vite.middlewares)
  } else {
    // Üretim ortamı: statik dosyaları servet et
    app.use(serveStatic(resolve('dist/public'), { index: false }))
  }

  app.use('*', async (req, res) => {
    try {
      const url = req.originalUrl

      let template: string
      let render: (url: string) => Promise<{ html: string }>

      if (!isProd && vite) {
        // Geliştirme: template ve render modülü Vite üzerinden alınır
        const templatePath = resolve('index.html')
        template = fs.readFileSync(templatePath, 'utf-8')
        template = await vite.transformIndexHtml(url, template)
        render = (await vite.ssrLoadModule('/server/entry-server.ts')).render
      } else {
        // Üretim: build sonucu dosyalar kullanılır
        const templatePath = resolve('dist/public/index.html')
        template = fs.readFileSync(templatePath, 'utf-8')
        render = (await import('../dist/server/entry-server.js')).render
      }

      const { html } = await render(url)

      const finalHtml = template.replace(`<!--app-html-->`, html)
      res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml)
    } catch (e: any) {
      if (!isProd && vite) {
        vite.ssrFixStacktrace(e)
      }
      console.error(e)
      res.status(500).end(e.message)
    }
  })

  return { app }
}
