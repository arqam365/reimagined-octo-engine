import 'dotenv/config'
import { serve } from '@hono/node-server'
import { app } from './app.js'
import { initSocket } from './lib/socket.js'

const port = Number(process.env.PORT ?? 4000)

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`✓ API running on http://localhost:${port}`)
  console.log(`✓ Docs at   http://localhost:${port}/docs`)
})

initSocket(server as never)
