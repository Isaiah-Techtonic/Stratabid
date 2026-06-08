// StrataBid realtime — fans out bid updates from Redis to Socket.IO rooms.
//
// Subscribes to the Redis `bid-updates` channel. Each connected client joins the
// Socket.IO room named after the item id it is viewing; every message on the
// channel is broadcast to that item's room. No host port is published — nginx
// proxies /socket.io/ to this service over the compose network.
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const PORT = Number(process.env.PORT) || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const CHANNEL = 'bid-updates';

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(server, {
  // Served same-origin behind nginx; default Socket.IO path is /socket.io/.
  cors: { origin: true },
});

io.on('connection', (socket) => {
  // Client tells us which item it is watching; we put it in that item's room.
  socket.on('join', (itemId) => {
    if (typeof itemId === 'string' && itemId) socket.join(itemId);
  });
  socket.on('leave', (itemId) => {
    if (typeof itemId === 'string' && itemId) socket.leave(itemId);
  });
});

// Dedicated subscriber connection (a connection in subscribe mode can't do other cmds).
const sub = new Redis(REDIS_URL);
sub.on('error', (e) => console.error('[realtime] redis sub error:', e.message));
sub.on('connect', () => console.log('[realtime] redis connected'));

sub.subscribe(CHANNEL, (err) => {
  if (err) {
    console.error('[realtime] subscribe failed:', err.message);
    return;
  }
  console.log(`[realtime] subscribed to ${CHANNEL}`);
});

sub.on('message', (channel, message) => {
  if (channel !== CHANNEL) return;
  let payload;
  try {
    payload = JSON.parse(message);
  } catch {
    return;
  }
  if (!payload || !payload.item_id) return;
  io.to(payload.item_id).emit('bid-update', payload);
});

server.listen(PORT, '0.0.0.0', () => console.log(`[realtime] listening on ${PORT}`));
