import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../lib/db.js'
import { emit } from '../lib/pubsub.js'
import { requireAuth } from '../middleware/auth.js'
import type { AppEnv } from '../types/env.js'

export const reservations = new Hono<AppEnv>()

const createSchema = z.object({
  outletSlug: z.string().optional(), // required for public (unauthenticated) requests
  name:       z.string().min(1),
  nameAr:     z.string().optional(),
  phone:      z.string().min(7),
  email:      z.string().email().optional(),
  date:       z.string(), // ISO date
  time:       z.string(),
  party:      z.number().int().positive(),
  type:       z.enum(['TABLE', 'CATERING']).default('TABLE'),
  notes:      z.string().optional(),
  tableId:    z.string().optional(),
})

// ── Public ────────────────────────────────────────────────────────────────────

// POST /reservations — customer-facing reservation form
reservations.post('/', zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json')

  // Resolve outlet: from auth key (admin) or outletSlug (public)
  let outletId: string
  const authOutlet = c.get('outlet' as never) as { id: string } | undefined
  if (authOutlet) {
    outletId = authOutlet.id
  } else if (body.outletSlug) {
    const outlet = await db.outlet.findUnique({ where: { slug: body.outletSlug, isActive: true } })
    if (!outlet) return c.json({ error: 'Outlet not found' }, 404)
    outletId = outlet.id
  } else {
    return c.json({ error: 'Pass outletSlug or authenticate with x-api-key' }, 400)
  }

  const refNum = `MZ-R-${Date.now().toString().slice(-5)}`
  const { outletSlug: _slug, ...bodyData } = body
  const res = await db.reservation.create({
    data: { ...bodyData, outletId, refNum, date: new Date(body.date) },
    include: { table: true },
  })
  await emit.reservationNew(res)
  return c.json(res, 201)
})

// ── Admin (auth required) ─────────────────────────────────────────────────────

reservations.use('/*', requireAuth)

// GET /reservations?date=2026-06-05&status=PENDING
reservations.get('/', async (c) => {
  const outlet = c.get('outlet')
  const date   = c.req.query('date')
  const status = c.req.query('status')

  const rows = await db.reservation.findMany({
    where: {
      outletId: outlet.id,
      ...(date   ? { date: { gte: new Date(date), lt: new Date(new Date(date).getTime() + 86_400_000) } } : {}),
      ...(status ? { status: status.toUpperCase() as never } : {}),
    },
    include: { table: true },
    orderBy: { date: 'asc' },
  })
  return c.json(rows)
})

// GET /reservations/:id
reservations.get('/:id', async (c) => {
  const outlet = c.get('outlet')
  const res = await db.reservation.findUnique({
    where:   { id: c.req.param('id') },
    include: { table: true },
  })
  if (!res || res.outletId !== outlet.id) return c.json({ error: 'Not found' }, 404)
  return c.json(res)
})

// PATCH /reservations/:id/status
reservations.patch(
  '/:id/status',
  zValidator('json', z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW']),
  })),
  async (c) => {
    const outlet = c.get('outlet')
    const existing = await db.reservation.findUnique({ where: { id: c.req.param('id') } })
    if (!existing || existing.outletId !== outlet.id) return c.json({ error: 'Not found' }, 404)

    const res = await db.reservation.update({
      where:   { id: c.req.param('id') },
      data:    { status: c.req.valid('json').status },
      include: { table: true },
    })
    return c.json(res)
  },
)
