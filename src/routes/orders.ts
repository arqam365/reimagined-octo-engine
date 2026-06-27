import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../lib/db.js'
import { emit } from '../lib/pubsub.js'
import { requireAuth } from '../middleware/auth.js'
import type { AppEnv } from '../types/env.js'

export const orders = new Hono<AppEnv>()

const orderItemSchema = z.object({
  menuItemId: z.string(),
  quantity:   z.number().int().positive(),
  notes:      z.string().optional(),
})

const createOrderSchema = z.object({
  tableId:    z.string().optional(),
  outletSlug: z.string().optional(), // required for delivery/takeaway
  guestName:  z.string().optional(),
  guestPhone: z.string().optional(),
  type:       z.enum(['DINE_IN', 'DELIVERY', 'TAKEAWAY']).default('DINE_IN'),
  notes:      z.string().optional(),
  items:      z.array(orderItemSchema).min(1),
})

// ── Public ────────────────────────────────────────────────────────────────────

// POST /orders — place order from QR table scan (no auth needed)
orders.post('/', zValidator('json', createOrderSchema), async (c) => {
  const body = c.req.valid('json')

  // Resolve outlet from table or outletSlug
  let outletId: string
  if (body.tableId) {
    const table = await db.table.findUnique({ where: { id: body.tableId } })
    if (!table) return c.json({ error: 'Table not found' }, 404)
    outletId = table.outletId
  } else if (body.outletSlug) {
    const outlet = await db.outlet.findUnique({ where: { slug: body.outletSlug, isActive: true } })
    if (!outlet) return c.json({ error: 'Outlet not found' }, 404)
    outletId = outlet.id
  } else {
    return c.json({ error: 'Provide tableId or outletSlug' }, 400)
  }

  // Fetch prices from DB — client cannot tamper with them
  const menuItems = await db.menuItem.findMany({
    where: { id: { in: body.items.map(i => i.menuItemId) }, outletId },
  })
  if (menuItems.length !== body.items.length) {
    return c.json({ error: 'One or more menu items not found or unavailable' }, 400)
  }
  const priceMap = Object.fromEntries(menuItems.map(m => [m.id, m.price]))
  const total    = body.items.reduce((sum, i) => sum + priceMap[i.menuItemId] * i.quantity, 0)
  const orderNum = `MZ-${Date.now().toString().slice(-5)}`

  const order = await db.order.create({
    data: {
      outletId,
      orderNum,
      tableId:    body.tableId,
      guestName:  body.guestName,
      guestPhone: body.guestPhone,
      type:       body.type,
      notes:      body.notes,
      total,
      items: {
        create: body.items.map(i => ({
          menuItemId: i.menuItemId,
          quantity:   i.quantity,
          unitPrice:  priceMap[i.menuItemId],
          notes:      i.notes,
        })),
      },
    },
    include: { items: { include: { menuItem: true } }, table: true },
  })

  emit.newOrder(order)
  return c.json(order, 201)
})

// GET /orders/:id — public so customers can track their order by ID
orders.get('/:id', async (c) => {
  const order = await db.order.findUnique({
    where:   { id: c.req.param('id') },
    include: { items: { include: { menuItem: true } }, table: true },
  })
  if (!order) return c.json({ error: 'Not found' }, 404)
  return c.json(order)
})

// ── Admin (auth required) ─────────────────────────────────────────────────────

orders.use('/*', requireAuth)

// GET /orders?status=RECEIVED
orders.get('/', async (c) => {
  const outlet = c.get('outlet')
  const status = c.req.query('status')

  const rows = await db.order.findMany({
    where: {
      outletId: outlet.id,
      ...(status ? { status: status.toUpperCase() as never } : {}),
    },
    include: { items: { include: { menuItem: true } }, table: true },
    orderBy: { createdAt: 'desc' },
  })
  return c.json(rows)
})

// PATCH /orders/:id/status
orders.patch(
  '/:id/status',
  zValidator('json', z.object({
    status: z.enum(['RECEIVED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']),
  })),
  async (c) => {
    const outlet = c.get('outlet')
    const existing = await db.order.findUnique({ where: { id: c.req.param('id') } })
    if (!existing || existing.outletId !== outlet.id) return c.json({ error: 'Not found' }, 404)

    const order = await db.order.update({
      where:   { id: c.req.param('id') },
      data:    { status: c.req.valid('json').status },
      include: { items: { include: { menuItem: true } }, table: true },
    })
    emit.orderUpdated(order)
    return c.json(order)
  },
)
