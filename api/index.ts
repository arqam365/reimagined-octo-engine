import 'dotenv/config'
import type { IncomingMessage, ServerResponse } from 'http'
import { getRequestListener } from '@hono/node-server'
import { app } from '../src/app.js'
import { initSocket } from '../src/lib/socket.js'

const nodeHandler = getRequestListener(app.fetch)

let ioReady = false

const handler = (req: IncomingMessage & { socket?: { server?: unknown } }, res: ServerResponse) => {
  if (!ioReady && req.socket?.server) {
    initSocket(req.socket.server as never)
    ioReady = true
  }
  return nodeHandler(req, res)
}

export default handler
