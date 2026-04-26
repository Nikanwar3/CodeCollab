const Y = require('yjs');
const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const Room = require('../models/Room');

// In-memory Yjs docs keyed by roomId — recreated from Redis/MongoDB on first join after restart
const docs = new Map();

async function getOrInitDoc(roomId) {
  if (docs.has(roomId)) return docs.get(roomId);

  const doc = new Y.Doc();
  docs.set(roomId, doc);

  let code = await redis.get(`room:${roomId}:code`);
  if (!code) {
    const room = await Room.findOne({ roomId });
    code = room?.code || '// Start coding here...';
  }

  doc.transact(() => {
    doc.getText('codemirror').insert(0, code);
  });

  return doc;
}

const initSocket = (io) => {
  // Validate JWT on every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { username } = socket.user;

    socket.on('join-room', async ({ roomId }) => {
      socket.join(roomId);
      socket.roomId = roomId;
      socket.username = username;

      await redis.sadd(`room:${roomId}:users`, username);

      const [doc, room, language] = await Promise.all([
        getOrInitDoc(roomId),
        Room.findOne({ roomId }),
        redis.get(`room:${roomId}:language`),
      ]);

      const yjsState = Array.from(Y.encodeStateAsUpdate(doc));

      socket.emit('room-state', {
        yjsState,
        language: language || room?.language || 'javascript',
        roomName: room?.name || '',
      });

      const users = await redis.smembers(`room:${roomId}:users`);
      io.to(roomId).emit('room-users', users);
      socket.to(roomId).emit('user-joined', { username });
    });

    // Yjs CRDT update — apply to server doc, persist text to Redis, relay to others
    socket.on('yjs-update', async ({ roomId, update }) => {
      const doc = docs.get(roomId);
      if (!doc) return;

      Y.applyUpdate(doc, new Uint8Array(update));
      const code = doc.getText('codemirror').toString();
      await redis.set(`room:${roomId}:code`, code);
      socket.to(roomId).emit('yjs-update', { update });
    });

    // Relay awareness (cursor positions) to others without parsing
    socket.on('awareness-update', ({ roomId, update }) => {
      socket.to(roomId).emit('awareness-update', { update });
    });

    socket.on('language-change', async ({ roomId, language }) => {
      await redis.set(`room:${roomId}:language`, language);
      io.to(roomId).emit('language-update', { language });
    });

    socket.on('save-code', async ({ roomId, language }) => {
      try {
        const doc = docs.get(roomId);
        const code = doc ? doc.getText('codemirror').toString() : await redis.get(`room:${roomId}:code`);
        await Room.findOneAndUpdate({ roomId }, { code, language });
        socket.emit('save-success', { message: 'Code saved!' });
      } catch {
        socket.emit('save-error', { message: 'Failed to save' });
      }
    });

    socket.on('disconnect', async () => {
      const { roomId } = socket;
      if (!roomId || !username) return;

      await redis.srem(`room:${roomId}:users`, username);
      const users = await redis.smembers(`room:${roomId}:users`);
      io.to(roomId).emit('room-users', users);
      io.to(roomId).emit('user-left', { username });
    });
  });
};

module.exports = initSocket;
