import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../lib/db.js'
import { emit } from '../lib/pubsub.js'
import { requireAuth } from '../middleware/auth.js'
import { randomUUID } from 'crypto'
import type { AppEnv } from '../types/env.js'

export const tables = new Hono<AppEnv>()

// ── Public ────────────────────────────────────────────────────────────────────

// GET /tables/by-uuid/:uuid — used by QR code scan at table
tables.get('/by-uuid/:uuid', async (c) => {
  const table = await db.table.findUnique({
    where:   { uuid: c.req.param('uuid') },
    include: { outlet: { select: { id: true, name: true, slug: true, currency: true } } },
  })
  if (!table) return c.json({ error: 'Table not found' }, 404)
  return c.json(table)
})

// ── Admin (auth required) ─────────────────────────────────────────────────────

tables.use('/*', requireAuth)

// GET /tables
tables.get('/', async (c) => {
  const outlet = c.get('outlet')
  const rows = await db.table.findMany({
    where:   { outletId: outlet.id },
    orderBy: { number: 'asc' },
  })
  return c.json(rows)
})

// GET /tables/:id
tables.get('/:id', async (c) => {
  const outlet = c.get('outlet')
  const table = await db.table.findUnique({ where: { id: c.req.param('id') } })
  if (!table || table.outletId !== outlet.id) return c.json({ error: 'Not found' }, 404)
  return c.json(table)
})

// POST /tables
tables.post(
  '/',
  zValidator('json', z.object({
    number:   z.number().int().positive(),
    capacity: z.number().int().positive(),
  })),
  async (c) => {
    const outlet = c.get('outlet')
    const table = await db.table.create({
      data: { ...c.req.valid('json'), outletId: outlet.id },
    })
    return c.json(table, 201)
  },
)

// PATCH /tables/:id/status
tables.patch(
  '/:id/status',
  zValidator('json', z.object({ status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED']) })),
  async (c) => {
    const outlet = c.get('outlet')
    const existing = await db.table.findUnique({ where: { id: c.req.param('id') } })
    if (!existing || existing.outletId !== outlet.id) return c.json({ error: 'Not found' }, 404)

    const table = await db.table.update({
      where: { id: c.req.param('id') },
      data:  { status: c.req.valid('json').status },
    })
    await emit.tableUpdated(table)
    return c.json(table)
  },
)

// DELETE /tables/:id
tables.delete('/:id', async (c) => {
  const outlet = c.get('outlet')
  const existing = await db.table.findUnique({ where: { id: c.req.param('id') } })
  if (!existing || existing.outletId !== outlet.id) return c.json({ error: 'Not found' }, 404)
  await db.table.delete({ where: { id: c.req.param('id') } })
  return c.json({ ok: true })
})

// POST /tables/:id/regen-qr
tables.post('/:id/regen-qr', async (c) => {
  const outlet = c.get('outlet')
  const existing = await db.table.findUnique({ where: { id: c.req.param('id') } })
  if (!existing || existing.outletId !== outlet.id) return c.json({ error: 'Not found' }, 404)

  const table = await db.table.update({
    where: { id: c.req.param('id') },
    data:  { uuid: randomUUID() },
  })
  return c.json(table)
})
