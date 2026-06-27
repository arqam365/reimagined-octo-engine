import 'dotenv/config'
import { serve } from '@hono/node-server'
import { app } from './app.js'

const port = Number(process.env.PORT ?? 4000)

serve({ fetch: app.fetch, port }, () => {
  console.log(`✓ API running on http://localhost:${port}`)
  console.log(`✓ Docs at   http://localhost:${port}/docs`)
})
