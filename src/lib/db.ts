import { PrismaNeonHTTP } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

// HTTP-based Neon adapter: no TCP connection, no cold-start wait,
// no channel_binding issues. Each query is a regular HTTPS call to Neon.
const connectionString = (
  process.env.DATABASE_URL_DIRECT ??
  process.env.DATABASE_URL ??
  ''
)

const adapter = new PrismaNeonHTTP(connectionString, {})
export const db = new PrismaClient({ adapter })
