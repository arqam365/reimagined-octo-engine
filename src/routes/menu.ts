import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../lib/db.js'
import { requireAuth } from '../middleware/auth.js'
import type { AppEnv } from '../types/env.js'
import type { MiddlewareHandler } from 'hono'

export const menu = new Hono<AppEnv>()

// Tries to resolve outlet from x-api-key; non-blocking (used for public GET)
const optionalAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const apiKey = c.req.header('x-api-key')
  if (apiKey) {
    const outlet = await db.outlet.findUnique({ where: { apiKey, isActive: true } })
    if (outlet) c.set('outlet', outlet)
  }
  await next()
}

menu.use('/*', optionalAuth)

const menuItemSchema = z.object({
  nameEn:      z.string().min(1),
  nameAr:      z.string().min(1),
  description: z.string(),
  price:       z.number().positive(),
  category:    z.enum(['PIZZA', 'PASTA', 'SOUPS', 'SALADS', 'DESSERTS', 'BEVERAGES']),
  available:   z.boolean().optional(),
  special:     z.boolean().optional(),
  imageUrl:    z.string().url().optional(),
})

// ── Public ────────────────────────────────────────────────────────────────────

// GET /menu?outlet=<slug>&category=<category>
// outlet slug required for customer-facing use; admin calls use API key auth
menu.get('/', async (c) => {
  const outletSlug = c.req.query('outlet')
  const category   = c.req.query('category')

  let outletId: string | undefined

  // If authenticated admin request, outlet is set via middleware
  const authOutlet = c.get('outlet' as never) as { id: string } | undefined
  if (authOutlet) {
    outletId = authOutlet.id
  } else if (outletSlug) {
    const outlet = await db.outlet.findUnique({ where: { slug: outletSlug, isActive: true } })
    if (!outlet) return c.json({ error: 'Outlet not found' }, 404)
    outletId = outlet.id
  } else {
    return c.json({ error: 'Pass ?outlet=<slug> or authenticate with x-api-key' }, 400)
  }

  const items = await db.menuItem.findMany({
    where: {
      outletId,
      ...(authOutlet ? {} : { available: true }),
      ...(category ? { category: category.toUpperCase() as never } : {}),
    },
    orderBy: [{ category: 'asc' }, { nameEn: 'asc' }],
  })
  return c.json(items)
})

// GET /menu/:id — public if item belongs to active outlet
menu.get('/:id', async (c) => {
  const item = await db.menuItem.findUnique({
    where: { id: c.req.param('id') },
    include: { outlet: { select: { slug: true, name: true } } },
  })
  if (!item) return c.json({ error: 'Not found' }, 404)
  return c.json(item)
})

// ── Admin (auth required) ─────────────────────────────────────────────────────

menu.use('/*', requireAuth)

menu.post('/', zValidator('json', menuItemSchema), async (c) => {
  const outlet = c.get('outlet')
  const item = await db.menuItem.create({
    data: { ...c.req.valid('json'), outletId: outlet.id },
  })
  return c.json(item, 201)
})

menu.patch('/:id', zValidator('json', menuItemSchema.partial()), async (c) => {
  const outlet = c.get('outlet')
  const item = await db.menuItem.findUnique({ where: { id: c.req.param('id') } })
  if (!item || item.outletId !== outlet.id) return c.json({ error: 'Not found' }, 404)
  const updated = await db.menuItem.update({
    where: { id: c.req.param('id') },
    data:  c.req.valid('json'),
  })
  return c.json(updated)
})

menu.delete('/:id', async (c) => {
  const outlet = c.get('outlet')
  const item = await db.menuItem.findUnique({ where: { id: c.req.param('id') } })
  if (!item || item.outletId !== outlet.id) return c.json({ error: 'Not found' }, 404)
  await db.menuItem.delete({ where: { id: c.req.param('id') } })
  return c.json({ ok: true })
})
