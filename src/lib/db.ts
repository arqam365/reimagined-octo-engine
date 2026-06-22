import { PrismaClient } from '@prisma/client'

// Uses the direct (non-pooler) URL — same approach proven by the seed script.
// The Neon serverless adapter + channel_binding=require is incompatible in Node.js runtime.
let _db: PrismaClient | null = null

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_db) {
      _db = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL_DIRECT } },
      })
    }
    return (_db as never)[prop]
  },
})
