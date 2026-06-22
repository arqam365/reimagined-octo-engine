import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../lib/db.js'
import type { AppEnv } from '../types/env.js'

// Platform-level outlet management
// These routes are protected by a platform master secret (X-Platform-Secret header),
// not by the per-outlet API key — so they use their own auth check.

export const outlets = new Hono<AppEnv>()

const PLATFORM_SECRET = process.env.PLATFORM_SECRET ?? process.env.API_SECRET ?? ''

function platformAuth(req: Request): boolean {
  return req.headers.get('x-platform-secret') === PLATFORM_SECRET
}

const createSchema = z.object({
  name:     z.string().min(1),
  slug:     z.string().min(1).regex(/^[a-z0-9-]+$/),
  city:     z.string().optional(),
  address:  z.string().optional(),
  phone:    z.string().optional(),
  email:    z.string().email().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  apiKey:   z.string().optional(), // auto-generated if omitted
})

const updateSchema = createSchema.partial().omit({ slug: true })

// GET /outlets — list all outlets
outlets.get('/', async (c) => {
  if (!platformAuth(c.req.raw)) return c.json({ error: 'Forbidden' }, 403)
  const rows = await db.outlet.findMany({ orderBy: { name: 'asc' } })
  return c.json(rows)
})

// GET /outlets/:id
outlets.get('/:id', async (c) => {
  if (!platformAuth(c.req.raw)) return c.json({ error: 'Forbidden' }, 403)
  const outlet = await db.outlet.findUnique({ where: { id: c.req.param('id') } })
  if (!outlet) return c.json({ error: 'Not found' }, 404)
  return c.json(outlet)
})

// POST /outlets — create new outlet
outlets.post('/', zValidator('json', createSchema), async (c) => {
  if (!platformAuth(c.req.raw)) return c.json({ error: 'Forbidden' }, 403)
  const body = c.req.valid('json')
  const outlet = await db.outlet.create({ data: body })
  return c.json(outlet, 201)
})

// PATCH /outlets/:id — update outlet details
outlets.patch('/:id', zValidator('json', updateSchema), async (c) => {
  if (!platformAuth(c.req.raw)) return c.json({ error: 'Forbidden' }, 403)
  const existing = await db.outlet.findUnique({ where: { id: c.req.param('id') } })
  if (!existing) return c.json({ error: 'Not found' }, 404)
  const outlet = await db.outlet.update({
    where: { id: c.req.param('id') },
    data:  c.req.valid('json'),
  })
  return c.json(outlet)
})

// PATCH /outlets/:id/toggle — activate or deactivate outlet
outlets.patch('/:id/toggle', async (c) => {
  if (!platformAuth(c.req.raw)) return c.json({ error: 'Forbidden' }, 403)
  const existing = await db.outlet.findUnique({ where: { id: c.req.param('id') } })
  if (!existing) return c.json({ error: 'Not found' }, 404)
  const outlet = await db.outlet.update({
    where: { id: c.req.param('id') },
    data:  { isActive: !existing.isActive },
  })
  return c.json(outlet)
})

// POST /outlets/:id/rotate-key — generate a new API key for the outlet
outlets.post('/:id/rotate-key', async (c) => {
  if (!platformAuth(c.req.raw)) return c.json({ error: 'Forbidden' }, 403)
  const existing = await db.outlet.findUnique({ where: { id: c.req.param('id') } })
  if (!existing) return c.json({ error: 'Not found' }, 404)
  const { randomUUID } = await import('crypto')
  const outlet = await db.outlet.update({
    where: { id: c.req.param('id') },
    data:  { apiKey: randomUUID() },
  })
  return c.json({ id: outlet.id, apiKey: outlet.apiKey })
})
