import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { apiReference } from '@scalar/hono-api-reference'
import { menu } from './routes/menu.js'
import { orders } from './routes/orders.js'
import { reservations } from './routes/reservations.js'
import { tables } from './routes/tables.js'
import { outlets } from './routes/outlets.js'

export const app = new Hono()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-platform-secret'],
    credentials: true,
  }),
)

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ ok: true, service: 'mazencito-api', version: '1.0.0' }))

// ── Routes ────────────────────────────────────────────────────────────────────

app.route('/menu',         menu)
app.route('/orders',       orders)
app.route('/reservations', reservations)
app.route('/tables',       tables)
app.route('/outlets',      outlets)

// ── API Documentation ─────────────────────────────────────────────────────────

app.get('/openapi.json', (c) => {
  return c.json({
    openapi: '3.1.0',
    info: {
      title: 'Restaurant Platform API',
      description: 'Multi-outlet restaurant management platform. Each outlet has its own `x-api-key`. Platform-level operations require `x-platform-secret`.',
      version: '1.0.0',
      contact: { name: 'Platform Support', email: 'dev@mazencito.com' },
    },
    servers: [
      { url: process.env.API_URL ?? 'http://localhost:4000', description: 'API server' },
    ],
    components: {
      securitySchemes: {
        OutletApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Per-outlet API key. Required for all admin operations.',
        },
        PlatformSecret: {
          type: 'apiKey',
          in: 'header',
          name: 'x-platform-secret',
          description: 'Platform master secret. Required for outlet management.',
        },
      },
      schemas: {
        Outlet: {
          type: 'object',
          properties: {
            id:        { type: 'string' },
            name:      { type: 'string' },
            slug:      { type: 'string' },
            city:      { type: 'string', nullable: true },
            address:   { type: 'string', nullable: true },
            phone:     { type: 'string', nullable: true },
            email:     { type: 'string', nullable: true },
            timezone:  { type: 'string' },
            currency:  { type: 'string' },
            apiKey:    { type: 'string' },
            isActive:  { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Table: {
          type: 'object',
          properties: {
            id:       { type: 'string' },
            number:   { type: 'integer' },
            capacity: { type: 'integer' },
            status:   { type: 'string', enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED'] },
            uuid:     { type: 'string', description: 'QR code identifier' },
          },
        },
        MenuItem: {
          type: 'object',
          properties: {
            id:          { type: 'string' },
            nameEn:      { type: 'string' },
            nameAr:      { type: 'string' },
            description: { type: 'string' },
            price:       { type: 'number' },
            category:    { type: 'string', enum: ['PIZZA', 'PASTA', 'SOUPS', 'SALADS', 'DESSERTS', 'BEVERAGES'] },
            available:   { type: 'boolean' },
            special:     { type: 'boolean' },
            imageUrl:    { type: 'string', nullable: true },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id:         { type: 'string' },
            orderNum:   { type: 'string', example: 'MZ-12345' },
            type:       { type: 'string', enum: ['DINE_IN', 'DELIVERY', 'TAKEAWAY'] },
            status:     { type: 'string', enum: ['RECEIVED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'] },
            total:      { type: 'number' },
            guestName:  { type: 'string', nullable: true },
            guestPhone: { type: 'string', nullable: true },
            notes:      { type: 'string', nullable: true },
            createdAt:  { type: 'string', format: 'date-time' },
          },
        },
        Reservation: {
          type: 'object',
          properties: {
            id:      { type: 'string' },
            refNum:  { type: 'string', example: 'MZ-R-12345' },
            name:    { type: 'string' },
            nameAr:  { type: 'string', nullable: true },
            phone:   { type: 'string' },
            email:   { type: 'string', nullable: true },
            date:    { type: 'string', format: 'date-time' },
            time:    { type: 'string', example: '19:30' },
            party:   { type: 'integer' },
            type:    { type: 'string', enum: ['TABLE', 'CATERING'] },
            status:  { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'] },
            notes:   { type: 'string', nullable: true },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            hint:  { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          responses: { '200': { description: 'API is running' } },
        },
      },

      // ── Outlets ─────────────────────────────────────────────────────────────
      '/outlets': {
        get: {
          tags: ['Outlets'],
          summary: 'List all outlets',
          security: [{ PlatformSecret: [] }],
          responses: {
            '200': { description: 'Array of outlets', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Outlet' } } } } },
            '403': { description: 'Forbidden' },
          },
        },
        post: {
          tags: ['Outlets'],
          summary: 'Create a new outlet',
          security: [{ PlatformSecret: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'slug'],
                  properties: {
                    name:     { type: 'string' },
                    slug:     { type: 'string', pattern: '^[a-z0-9-]+$' },
                    city:     { type: 'string' },
                    address:  { type: 'string' },
                    phone:    { type: 'string' },
                    email:    { type: 'string' },
                    timezone: { type: 'string', default: 'Asia/Riyadh' },
                    currency: { type: 'string', default: 'SAR' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Outlet created' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/outlets/{id}': {
        get: {
          tags: ['Outlets'],
          summary: 'Get outlet by ID',
          security: [{ PlatformSecret: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Outlet object' }, '404': { description: 'Not found' } },
        },
        patch: {
          tags: ['Outlets'],
          summary: 'Update outlet details',
          security: [{ PlatformSecret: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Outlet' } } } },
          responses: { '200': { description: 'Updated outlet' }, '404': { description: 'Not found' } },
        },
      },
      '/outlets/{id}/toggle': {
        patch: {
          tags: ['Outlets'],
          summary: 'Toggle outlet active/inactive',
          security: [{ PlatformSecret: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Outlet with updated isActive' } },
        },
      },
      '/outlets/{id}/rotate-key': {
        post: {
          tags: ['Outlets'],
          summary: 'Rotate outlet API key',
          security: [{ PlatformSecret: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'New API key', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' }, apiKey: { type: 'string' } } } } } } },
        },
      },

      // ── Menu ─────────────────────────────────────────────────────────────────
      '/menu': {
        get: {
          tags: ['Menu'],
          summary: 'Get menu items',
          description: 'Public: pass `?outlet=slug`. Admin: authenticate with x-api-key.',
          parameters: [
            { name: 'outlet', in: 'query', schema: { type: 'string' }, description: 'Outlet slug (public access)' },
            { name: 'category', in: 'query', schema: { type: 'string', enum: ['PIZZA', 'PASTA', 'SOUPS', 'SALADS', 'DESSERTS', 'BEVERAGES'] } },
          ],
          security: [{ OutletApiKey: [] }, {}],
          responses: { '200': { description: 'Array of menu items' } },
        },
        post: {
          tags: ['Menu'],
          summary: 'Create menu item',
          security: [{ OutletApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['nameEn', 'nameAr', 'description', 'price', 'category'],
                  properties: {
                    nameEn:      { type: 'string' },
                    nameAr:      { type: 'string' },
                    description: { type: 'string' },
                    price:       { type: 'number' },
                    category:    { type: 'string', enum: ['PIZZA', 'PASTA', 'SOUPS', 'SALADS', 'DESSERTS', 'BEVERAGES'] },
                    available:   { type: 'boolean' },
                    special:     { type: 'boolean' },
                    imageUrl:    { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Menu item created' } },
        },
      },
      '/menu/{id}': {
        get: {
          tags: ['Menu'],
          summary: 'Get single menu item',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Menu item' }, '404': { description: 'Not found' } },
        },
        patch: {
          tags: ['Menu'],
          summary: 'Update menu item',
          security: [{ OutletApiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MenuItem' } } } },
          responses: { '200': { description: 'Updated item' } },
        },
        delete: {
          tags: ['Menu'],
          summary: 'Delete menu item',
          security: [{ OutletApiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Deleted' } },
        },
      },

      // ── Tables ────────────────────────────────────────────────────────────────
      '/tables': {
        get: {
          tags: ['Tables'],
          summary: 'List tables for outlet',
          security: [{ OutletApiKey: [] }],
          responses: { '200': { description: 'Array of tables' } },
        },
        post: {
          tags: ['Tables'],
          summary: 'Create table',
          security: [{ OutletApiKey: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['number', 'capacity'], properties: { number: { type: 'integer' }, capacity: { type: 'integer' } } },
              },
            },
          },
          responses: { '201': { description: 'Table created' } },
        },
      },
      '/tables/by-uuid/{uuid}': {
        get: {
          tags: ['Tables'],
          summary: 'Get table by QR UUID (public)',
          description: 'Used by QR code scan at the table. Returns table + outlet info.',
          parameters: [{ name: 'uuid', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Table with outlet info' }, '404': { description: 'Not found' } },
        },
      },
      '/tables/{id}': {
        get: {
          tags: ['Tables'],
          summary: 'Get table by ID',
          security: [{ OutletApiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Table' } },
        },
      },
      '/tables/{id}/status': {
        patch: {
          tags: ['Tables'],
          summary: 'Update table status',
          security: [{ OutletApiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['AVAILABLE', 'OCCUPIED', 'RESERVED'] } } } } },
          },
          responses: { '200': { description: 'Updated table' } },
        },
      },
      '/tables/{id}/regen-qr': {
        post: {
          tags: ['Tables'],
          summary: 'Regenerate QR UUID for table',
          security: [{ OutletApiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Table with new UUID' } },
        },
      },

      // ── Orders ────────────────────────────────────────────────────────────────
      '/orders': {
        get: {
          tags: ['Orders'],
          summary: 'List orders',
          security: [{ OutletApiKey: [] }],
          parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['RECEIVED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'] } }],
          responses: { '200': { description: 'Array of orders with items' } },
        },
        post: {
          tags: ['Orders'],
          summary: 'Place order (public — from QR table scan or delivery form)',
          description: 'Provide `tableId` for dine-in or `outletSlug` for delivery/takeaway.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    tableId:    { type: 'string' },
                    outletSlug: { type: 'string' },
                    guestName:  { type: 'string' },
                    guestPhone: { type: 'string' },
                    type:       { type: 'string', enum: ['DINE_IN', 'DELIVERY', 'TAKEAWAY'], default: 'DINE_IN' },
                    notes:      { type: 'string' },
                    items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['menuItemId', 'quantity'],
                        properties: {
                          menuItemId: { type: 'string' },
                          quantity:   { type: 'integer', minimum: 1 },
                          notes:      { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Order created with total calculated server-side' } },
        },
      },
      '/orders/{id}': {
        get: {
          tags: ['Orders'],
          summary: 'Get order by ID',
          security: [{ OutletApiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Order with items' } },
        },
      },
      '/orders/{id}/status': {
        patch: {
          tags: ['Orders'],
          summary: 'Update order status',
          security: [{ OutletApiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['RECEIVED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'] } } } } },
          },
          responses: { '200': { description: 'Updated order' } },
        },
      },

      // ── Reservations ─────────────────────────────────────────────────────────
      '/reservations': {
        get: {
          tags: ['Reservations'],
          summary: 'List reservations',
          security: [{ OutletApiKey: [] }],
          parameters: [
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter by date (ISO)' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'] } },
          ],
          responses: { '200': { description: 'Array of reservations' } },
        },
        post: {
          tags: ['Reservations'],
          summary: 'Create reservation (public — customer-facing form)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'phone', 'date', 'time', 'party'],
                  properties: {
                    outletSlug: { type: 'string', description: 'Required for public requests' },
                    name:       { type: 'string' },
                    nameAr:     { type: 'string' },
                    phone:      { type: 'string' },
                    email:      { type: 'string' },
                    date:       { type: 'string', format: 'date' },
                    time:       { type: 'string', example: '19:30' },
                    party:      { type: 'integer', minimum: 1 },
                    type:       { type: 'string', enum: ['TABLE', 'CATERING'], default: 'TABLE' },
                    notes:      { type: 'string' },
                    tableId:    { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Reservation created with reference number' } },
        },
      },
      '/reservations/{id}': {
        get: {
          tags: ['Reservations'],
          summary: 'Get reservation by ID',
          security: [{ OutletApiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Reservation' } },
        },
      },
      '/reservations/{id}/status': {
        patch: {
          tags: ['Reservations'],
          summary: 'Update reservation status',
          security: [{ OutletApiKey: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'] } } } } },
          },
          responses: { '200': { description: 'Updated reservation' } },
        },
      },
    },
    tags: [
      { name: 'System',       description: 'Health and meta' },
      { name: 'Outlets',      description: 'Platform-level outlet management (x-platform-secret)' },
      { name: 'Menu',         description: 'Menu items — public read, auth write' },
      { name: 'Tables',       description: 'Table management and QR codes' },
      { name: 'Orders',       description: 'Order placement (public) and management (auth)' },
      { name: 'Reservations', description: 'Reservation booking (public) and management (auth)' },
    ],
  })
})

app.get(
  '/docs',
  apiReference({
    theme: 'saturn',
    spec: { url: '/openapi.json' },
  }),
)

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message }, 500)
})
