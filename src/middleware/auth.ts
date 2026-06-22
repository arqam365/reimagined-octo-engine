import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../types/env.js'
import { db } from '../lib/db.js'

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const apiKey = c.req.header('x-api-key')
  if (!apiKey) {
    return c.json({ error: 'Unauthorized', hint: 'Pass x-api-key header' }, 401)
  }
  const outlet = await db.outlet.findUnique({ where: { apiKey, isActive: true } })
  if (!outlet) {
    return c.json({ error: 'Unauthorized', hint: 'Invalid API key' }, 401)
  }
  c.set('outlet', outlet)
  await next()
}
