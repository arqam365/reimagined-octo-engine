import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import ws from 'ws'

// WebSocket constructor needed for Node.js/Vercel runtime
neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? '',
})

export const db = new PrismaClient({ adapter })
