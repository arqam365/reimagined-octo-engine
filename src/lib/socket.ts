import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-streams-adapter'
import { Redis as UpstashRedis } from '@upstash/redis'
import type { Server as HTTPServer } from 'http'

let io: Server | null = null

export function initSocket(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  })

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    io.adapter(createAdapter(redis))
    console.log('✓ Socket.io: Upstash Redis streams adapter connected')
  }

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id))
  })

  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

export const emit = {
  newOrder:       (order: unknown) => io?.emit('order:new', order),
  orderUpdated:   (order: unknown) => io?.emit('order:updated', order),
  tableUpdated:   (table: unknown) => io?.emit('table:updated', table),
  reservationNew: (res: unknown)   => io?.emit('reservation:new', res),
}
