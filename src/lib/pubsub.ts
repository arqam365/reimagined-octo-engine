import { Redis } from '@upstash/redis'

const EVENTS_KEY = 'mz:events'
const MAX_EVENTS = 500

let _redis: Redis | null = null

function redis(): Redis | null {
  if (!_redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    _redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

export interface Event {
  type: string
  data: unknown
  ts:   number
}

export async function publish(type: string, data: unknown): Promise<void> {
  const r = redis()
  if (!r) return
  const ts = Date.now()
  // Sorted set: score = timestamp, member = serialized event
  // Allows efficient range queries by time
  await r.zadd(EVENTS_KEY, { score: ts, member: JSON.stringify({ type, data, ts }) })
  // Trim to last MAX_EVENTS to prevent unbounded growth
  await r.zremrangebyrank(EVENTS_KEY, 0, -(MAX_EVENTS + 1))
}

export async function getEventsSince(since: number): Promise<Event[]> {
  const r = redis()
  if (!r) return []
  const raw = await r.zrange(EVENTS_KEY, since + 1, '+inf', { byScore: true })
  return (raw as string[]).map(s => JSON.parse(s) as Event)
}

export const emit = {
  newOrder:       (data: unknown) => publish('order:new',       data),
  orderUpdated:   (data: unknown) => publish('order:updated',   data),
  tableUpdated:   (data: unknown) => publish('table:updated',   data),
  reservationNew: (data: unknown) => publish('reservation:new', data),
}
